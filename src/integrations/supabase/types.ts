export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          date: string
          id: string
          stars: number
          text: string | null
        }
        Insert: {
          date?: string
          id?: string
          stars: number
          text?: string | null
        }
        Update: {
          date?: string
          id?: string
          stars?: number
          text?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      photo_captions: {
        Row: {
          caption: string | null
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      police_officers: {
        Row: {
          cpf: string
          created_at: string
          graduacao: string
          id: string
          naturalidade: string
          nome_completo: string
          nome_mae: string
          nome_pai: string
          rgpm: string
          telefone: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          graduacao: string
          id?: string
          naturalidade: string
          nome_completo: string
          nome_mae: string
          nome_pai: string
          rgpm: string
          telefone: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          graduacao?: string
          id?: string
          naturalidade?: string
          nome_completo?: string
          nome_mae?: string
          nome_pai?: string
          rgpm?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_heartbeat: {
        Row: {
          id: number
          last_ping: string
          ping_count: number
        }
        Insert: {
          id?: number
          last_ping?: string
          ping_count?: number
        }
        Update: {
          id?: number
          last_ping?: string
          ping_count?: number
        }
        Relationships: []
      }
      unidades: {
        Row: {
          abreviacao: string | null
          ativa: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cr: string | null
          created_at: string
          endereco_linha1: string | null
          endereco_linha2: string | null
          endereco_linha3: string | null
          id: string
          logradouro: string | null
          nome_oficial: string
          numero: number | null
          numero_endereco: string | null
          possui_forca_tatica: boolean
          tipo: Database["public"]["Enums"]["tipo_unidade"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          abreviacao?: string | null
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cr?: string | null
          created_at?: string
          endereco_linha1?: string | null
          endereco_linha2?: string | null
          endereco_linha3?: string | null
          id?: string
          logradouro?: string | null
          nome_oficial: string
          numero?: number | null
          numero_endereco?: string | null
          possui_forca_tatica?: boolean
          tipo?: Database["public"]["Enums"]["tipo_unidade"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          abreviacao?: string | null
          ativa?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cr?: string | null
          created_at?: string
          endereco_linha1?: string | null
          endereco_linha2?: string | null
          endereco_linha3?: string | null
          id?: string
          logradouro?: string | null
          nome_oficial?: string
          numero?: number | null
          numero_endereco?: string | null
          possui_forca_tatica?: boolean
          tipo?: Database["public"]["Enums"]["tipo_unidade"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      usuarios_login: {
        Row: {
          cr: string
          created_at: string
          id: number
          nivel_acesso: string
          rgpm: string
          senha: string
          unidade: string
          updated_at: string | null
        }
        Insert: {
          cr: string
          created_at?: string
          id?: number
          nivel_acesso: string
          rgpm: string
          senha: string
          unidade: string
          updated_at?: string | null
        }
        Update: {
          cr?: string
          created_at?: string
          id?: number
          nivel_acesso?: string
          rgpm?: string
          senha?: string
          unidade?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_unidades_bulk: { Args: { payload: Json }; Returns: undefined }
    }
    Enums: {
      tipo_unidade: "BPM" | "CIPM" | "CPM" | "NPM" | "OUTRO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tipo_unidade: ["BPM", "CIPM", "CPM", "NPM", "OUTRO"],
    },
  },
} as const
