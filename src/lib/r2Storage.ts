const BASE = "/.netlify/functions";

export async function r2ListTcos(userId: string): Promise<any[]> {
  const res = await fetch(`${BASE}/list-tcos?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Erro ao listar TCOs");
  return res.json();
}

export async function r2GetDownloadUrl(fileName: string): Promise<string> {
  const res = await fetch(`${BASE}/download-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName }),
  });
  if (!res.ok) throw new Error("Erro ao gerar URL de download");
  const data = await res.json();
  return data.downloadUrl;
}

export async function r2GetUploadUrl(fileName: string, fileType: string): Promise<string> {
  const res = await fetch(`${BASE}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileType }),
  });
  if (!res.ok) throw new Error("Erro ao gerar URL de upload");
  const data = await res.json();
  return data.uploadUrl;
}

export async function r2DeleteTco(fileName: string): Promise<void> {
  const res = await fetch(`${BASE}/delete-tco`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName }),
  });
  if (!res.ok) throw new Error("Erro ao excluir TCO");
}

export async function r2UploadFile(file: Blob, r2Key: string, contentType: string): Promise<void> {
  const uploadUrl = await r2GetUploadUrl(r2Key, contentType);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!putRes.ok) throw new Error("Erro ao fazer upload do arquivo");
}
