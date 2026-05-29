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

const R2_ENDPOINT = cleanUrl(Deno.env.get("R2_ENDPOINT"));
const R2_ACCESS_KEY_ID = (Deno.env.get("R2_ACCESS_KEY_ID") || "").trim();
const R2_SECRET_ACCESS_KEY = (Deno.env.get("R2_SECRET_ACCESS_KEY") || "").trim();
const R2_BUCKET_NAME = (Deno.env.get("R2_BUCKET_NAME") || "").trim();

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
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
        if (!userId) return json({ error: "userId obrigatório" }, 400);
        const prefix = `tcos/${userId}/`;
        const out = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: prefix }));
        const items = (out.Contents || [])
          .filter((o) => o.Key?.endsWith(".json"))
          .map((o) => ({ key: o.Key!, size: o.Size, lastModified: o.LastModified }));

        const tcos = await Promise.all(
          items.map(async (it) => {
            try {
              const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: it.key }), { expiresIn: 300 });
              const r = await fetch(url);
              const meta = await r.json();
              return { ...meta, _key: it.key };
            } catch {
              return null;
            }
          })
        );
        return json(tcos.filter(Boolean));
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
