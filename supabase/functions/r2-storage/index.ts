// Cloudflare R2 storage proxy via Supabase Edge Function
// Uses AWS SigV4 to talk to R2's S3-compatible API.
// Actions: list, upload, download, delete (presigned URLs for upload/download)

import { S3Client, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.658.1";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.658.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Sanitize URL: strip markdown link formatting like [url](url) or surrounding brackets/whitespace
function cleanUrl(raw: string | undefined): string {
  if (!raw) return "";
  let v = raw.trim();
  // Markdown link [text](url)
  const md = v.match(/\]\((https?:\/\/[^)]+)\)/);
  if (md) v = md[1];
  // Strip wrapping [ ] or < >
  v = v.replace(/^[\[<]+/, "").replace(/[\]>]+$/, "");
  return v.trim();
}

const DEFAULT_R2_ENDPOINT = "https://9c99360d74e441a4ae63ae79ca3d180f.r2.cloudflarestorage.com";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function resolveR2Config() {
  const rawEndpoint = cleanUrl(Deno.env.get("R2_ENDPOINT"));
  const rawBucket = cleanUrl(Deno.env.get("R2_BUCKET_NAME"));

  let endpoint = rawEndpoint;
  let bucketName = rawBucket;

  if (!isValidHttpUrl(endpoint) && isValidHttpUrl(bucketName)) {
    endpoint = bucketName;
    bucketName = rawEndpoint;
  }

  if (!isValidHttpUrl(endpoint)) endpoint = DEFAULT_R2_ENDPOINT;

  return { endpoint, bucketName };
}

const { endpoint: R2_ENDPOINT, bucketName: R2_BUCKET_NAME } = resolveR2Config();
const R2_ACCESS_KEY_ID = (Deno.env.get("R2_ACCESS_KEY_ID") || "").trim();
const R2_SECRET_ACCESS_KEY = (Deno.env.get("R2_SECRET_ACCESS_KEY") || "").trim();

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function onlyDigits(value: unknown): string {
  return String(value || "").replace(/\D+/g, "");
}

function isAdminAccess(value: unknown): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "administrador";
}

function ownerFromLegacyKey(key: string): string {
  const fileName = key.split("/").pop() || "";
  return onlyDigits(fileName.split("_")[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      return json({ error: "R2 não configurado (faltam secrets)" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case "list": {
        const userId = String(body.userId || "");
        const userType = String(body.userType || "");
        if (!userId) return json({ error: "userId obrigatório" }, 400);
        const currentUserRgpm = onlyDigits(userId);
        const canSeeAll = isAdminAccess(userType);
        const items: { key: string; size?: number; lastModified?: Date }[] = [];
        let continuationToken: string | undefined = undefined;

        do {
          const out = await s3.send(new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            Prefix: "tcos/",
            ContinuationToken: continuationToken,
          }));
          (out.Contents || [])
            .filter((o) => o.Key?.endsWith(".json"))
            .forEach((o) => items.push({ key: o.Key!, size: o.Size, lastModified: o.LastModified }));
          continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
        } while (continuationToken);

        const tcos = await Promise.all(
          items.map(async (it) => {
            try {
              const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: it.key }), { expiresIn: 300 });
              const r = await fetch(url);
              const meta = await r.json();
              const docxKey = String(meta?.docxKey || it.key.replace(/\.json$/i, ".docx"));
              const ownerRgpm = onlyDigits(meta?.ownerRgpm) || ownerFromLegacyKey(it.key) || onlyDigits(docxKey);
              if (!canSeeAll && ownerRgpm !== currentUserRgpm) return null;
              return { ...meta, docxKey, ownerRgpm, _key: it.key };
            } catch {
              return null;
            }
          })
        );
        return json(tcos.filter(Boolean).sort((a: any, b: any) => {
          const ta = Date.parse(String(a?.savedAt || "")) || 0;
          const tb = Date.parse(String(b?.savedAt || "")) || 0;
          return tb - ta;
        }));
      }

      case "upload-url": {
        const fileName = String(body.fileName || "");
        const fileType = String(body.fileType || "application/octet-stream");
        if (!fileName) return json({ error: "fileName obrigatório" }, 400);
        const url = await getSignedUrl(
          s3,
          new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: fileName, ContentType: fileType }),
          { expiresIn: 600 }
        );
        return json({ uploadUrl: url });
      }

      case "upload": {
        const fileName = String(body.fileName || "");
        const fileType = String(body.fileType || "application/octet-stream");
        const base64 = String(body.base64 || "");
        if (!fileName) return json({ error: "fileName obrigatório" }, 400);
        if (!base64) return json({ error: "arquivo obrigatório" }, 400);

        const uploadUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: fileName, ContentType: fileType }),
          { expiresIn: 600 }
        );
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": fileType },
          body: base64ToBytes(base64),
        });
        if (!putRes.ok) {
          const text = await putRes.text().catch(() => "");
          return json({ error: `Falha ao enviar para o R2 (${putRes.status}): ${text}` }, 500);
        }
        return json({ ok: true });
      }

      case "download-url": {
        const fileName = String(body.fileName || "");
        if (!fileName) return json({ error: "fileName obrigatório" }, 400);
        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: fileName }),
          { expiresIn: 600 }
        );
        return json({ downloadUrl: url });
      }

      case "delete": {
        const fileName = String(body.fileName || "");
        if (!fileName) return json({ error: "fileName obrigatório" }, 400);
        await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: fileName }));
        // also try to delete sidecar .json or .docx
        const alt = fileName.endsWith(".json") ? fileName.replace(/\.json$/, ".docx") : fileName.replace(/\.docx$/, ".json");
        try { await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: alt })); } catch {}
        return json({ ok: true });
      }

      default:
        return json({ error: "ação inválida" }, 400);
    }
  } catch (err) {
    console.error("r2-storage error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
