import express from "express";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 4173;

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

const R2_CONFIG = {
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
};

const s3 = new S3Client(R2_CONFIG);
const bucketName = process.env.R2_BUCKET_NAME;

// Helper to sanitize key
function sanitizeKey(key) {
  let k = key.trim();
  while (k.startsWith("/")) k = k.slice(1);
  return k;
}

// Upload URL
app.post("/.netlify/functions/upload-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) return res.status(400).json({ error: "fileName and fileType required" });
    
    const key = sanitizeKey(fileName);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });
    
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ uploadUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Download URL
app.post("/.netlify/functions/download-url", async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: "fileName required" });
    
    const key = sanitizeKey(fileName);
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ downloadUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List TCOs
app.get("/.netlify/functions/list-tcos", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    const prefix = `tcos/${sanitizeKey(userId)}/`;
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    
    const response = await s3.send(command);
    const files = response.Contents || [];
    
    // Logic similar to list-tcos.ts to filter and map JSON metadata
    // For simplicity, we just return basic list or try to fetch metadata if possible.
    // However, the original function fetches content for JSON files.
    // To mimic it properly, we would need to fetch each JSON file.
    // For now, let's implement a basic version that returns empty array if too complex, 
    // or try to fetch just the JSONs.
    
    // The original implementation fetches the JSON content for each TCO found.
    const jsonFiles = files.filter(f => f.Key.endsWith(".json"));
    
    const tcos = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const getCmd = new GetObjectCommand({ Bucket: bucketName, Key: file.Key });
        const getRes = await s3.send(getCmd);
        const str = await getRes.Body.transformToString();
        const data = JSON.parse(str);
        return {
          ...data,
          fileName: path.basename(file.Key, ".json") + ".docx", // infer docx name
          lastModified: file.LastModified,
          size: file.Size // size of json, not docx, but okay for list
        };
      } catch (e) {
        console.error("Error reading json", file.Key, e);
        return null;
      }
    }));
    
    res.json(tcos.filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete TCO
app.post("/.netlify/functions/delete-tco", async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: "fileName required" });
    
    const key = sanitizeKey(fileName); // e.g. tcos/user/file.docx
    const jsonKey = key.replace(/\.docx$/i, ".json");
    
    await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: jsonKey }));
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback for SPA routing
// Using regex for Express 5 compatibility if * fails or is strict
app.get(/^(?!\/\.netlify\/).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Local server running at http://localhost:${port}`);
  console.log(`Serving static files from ${path.join(__dirname, "dist")}`);
  console.log(`Emulating Netlify Functions at /.netlify/functions/*`);
});
