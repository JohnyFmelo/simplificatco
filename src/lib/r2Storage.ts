import { supabase } from "@/integrations/supabase/client";

async function callR2(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("r2-storage", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || `Erro na ação ${action}`);
  if (data && (data as any).error) throw new Error((data as any).error);
  return data;
}

export async function r2ListTcos(userId: string): Promise<any[]> {
  return (await callR2("list", { userId })) as any[];
}

export async function r2GetDownloadUrl(fileName: string): Promise<string> {
  const data = await callR2("download-url", { fileName });
  return (data as any).downloadUrl;
}

export async function r2GetUploadUrl(fileName: string, fileType: string): Promise<string> {
  const data = await callR2("upload-url", { fileName, fileType });
  return (data as any).uploadUrl;
}

export async function r2DeleteTco(fileName: string): Promise<void> {
  await callR2("delete", { fileName });
}

export async function r2UploadFile(file: Blob, r2Key: string, contentType: string): Promise<void> {
  const uploadUrl = await r2GetUploadUrl(r2Key, contentType);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new Error(`Erro ao fazer upload do arquivo (${putRes.status}): ${txt}`);
  }
}
