import { supabase } from "@/integrations/supabase/client";

// Nome do bucket configurável via .env
// Altere `VITE_SUPABASE_BUCKET_PHOTOS` para apontar para um bucket existente no seu projeto.
// Default mantém "tco-pdfs" para compatibilidade.
const BUCKET_NAME = (import.meta as any)?.env?.VITE_SUPABASE_BUCKET_PHOTOS || "tco-pdfs";

export type UploadResult = {
  path: string;
  publicUrl: string;
  name: string;
  size: number;
  mimeType: string;
};

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function getUserIdOrAnon(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    return uid || "anon";
  } catch {
    return "anon";
  }
}

export async function uploadPhoto(options: { file: File; tcoId: string; userId?: string }): Promise<UploadResult | null> {
  const { file, tcoId } = options;
  const userId = options.userId || (await getUserIdOrAnon());
  const safeName = sanitizeName(file.name);
  const timestamp = Date.now();
  // Subpasta dedicada a fotos para não misturar com PDFs
  const path = `photos/tcos/${userId}/${tcoId}/${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    console.error("uploadPhoto error:", `bucket=${BUCKET_NAME}`, error.message);
    return null;
  }

  const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return {
    path,
    publicUrl: pub.publicUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

export type ListedPhoto = {
  path: string;
  publicUrl: string;
  name: string;
  size?: number;
};

export async function listPhotos(options: { tcoId: string; userId?: string }): Promise<ListedPhoto[]> {
  const userId = options.userId || (await getUserIdOrAnon());
  const prefix = `photos/tcos/${userId}/${options.tcoId}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(prefix, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    console.error("listPhotos error:", error.message);
    return [];
  }
  return (data || []).map((item) => {
    const path = `${prefix}/${item.name}`;
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return { path, publicUrl: pub.publicUrl, name: item.name, size: item.metadata?.size };
  });
}

export async function deletePhoto(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) {
    console.error("deletePhoto error:", error.message);
    return false;
  }
  return true;
}