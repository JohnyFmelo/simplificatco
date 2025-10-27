// Bridge: re-export the configured Supabase client used in this app
// Cast to 'any' to avoid type constraints when using tables not declared in generated types.
import { supabase as rawSupabase } from "@/integrations/supabase/client";
export const supabase: any = rawSupabase;