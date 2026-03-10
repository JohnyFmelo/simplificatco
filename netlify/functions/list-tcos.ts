import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

type NetlifyEvent = {
  httpMethod?: string;
  queryStringParameters?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
};

function buildCorsHeaders(origin?: string) {
  const allowOrigin = origin || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sanitizePrefix(prefix: string) {
  let p = prefix.trim();
  while (p.startsWith("/")) p = p.slice(1);
  return p;
}

async function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export const handler = async (event: NetlifyEvent) => {
  const corsHeaders = buildCorsHeaders(event.headers?.origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  const userId = String(event.queryStringParameters?.userId || "").trim();
  if (!userId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "userId é obrigatório" }) };
  }
  if (userId.includes("..") || userId.includes("/") || userId.includes("\\")) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "userId inválido" }) };
  }

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Variáveis de ambiente do R2 ausentes" }) };
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  const prefix = sanitizePrefix(`tcos/${userId}/`);
  const jsonKeys: string[] = [];
  let continuationToken: string | undefined = undefined;

  try {
    do {
      const resp = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      (resp.Contents || []).forEach((obj) => {
        const key = obj.Key || "";
        if (key.endsWith(".json")) jsonKeys.push(key);
      });

      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);

    const items = await Promise.all(
      jsonKeys.map(async (key) => {
        try {
          const g = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
          const body = (g as any).Body;
          if (!body) return null;
          const text = await streamToString(body);
          const parsed = JSON.parse(text || "{}");
          const docxKey = key.replace(/\.json$/i, ".docx");
          return { ...parsed, docxKey };
        } catch {
          return null;
        }
      })
    );

    const filtered = items.filter(Boolean);
    filtered.sort((a: any, b: any) => {
      const ta = Date.parse(String(a?.savedAt || "")) || 0;
      const tb = Date.parse(String(b?.savedAt || "")) || 0;
      return tb - ta;
    });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(filtered) };
  } catch {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Erro ao listar TCOs" }) };
  }
};
