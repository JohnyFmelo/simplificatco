import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

type NetlifyEvent = {
  httpMethod?: string;
  body?: string | null;
  headers?: Record<string, string | undefined>;
};

function buildCorsHeaders(origin?: string) {
  const allowOrigin = origin || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sanitizeKey(key: string) {
  let k = key.trim();
  while (k.startsWith("/")) k = k.slice(1);
  return k;
}

export const handler = async (event: NetlifyEvent) => {
  const corsHeaders = buildCorsHeaders(event.headers?.origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  let payload: { fileName?: string } = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Body inválido" }) };
  }

  const fileName = sanitizeKey(String(payload.fileName || ""));
  if (!fileName) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "fileName é obrigatório" }) };
  }
  if (fileName.includes("..")) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "fileName inválido" }) };
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

  try {
    // Delete both .docx and .json sidecar
    const jsonKey = fileName.replace(/\.docx$/i, ".json");
    await Promise.all([
      s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: fileName })),
      s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: jsonKey })),
    ]);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
  } catch {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Erro ao excluir arquivo" }) };
  }
};
