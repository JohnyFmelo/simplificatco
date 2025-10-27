import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "tco-pdfs";

export interface DeleteTCORequest {
  id: string;
  pdfPath: string; // e.g. "tcos/<userId>/<fileName>.pdf"
}

export interface DeleteTCOResponse {
  success: boolean;
  error?: string;
}

// Deletes a single TCO PDF from Supabase Storage bucket.
// Returns a simple success flag and optional error message to match current usage.
export async function deleteTCO(req: DeleteTCORequest): Promise<DeleteTCOResponse> {
  try {
    if (!req?.pdfPath) {
      return { success: false, error: "Caminho do PDF não informado." };
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([req.pdfPath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}