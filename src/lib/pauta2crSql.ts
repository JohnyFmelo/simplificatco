// Script SQL ÚNICO para ser executado 1 vez no Supabase SQL Editor.
// Gera: tabela de slots, tabela de feriados, RPC alocar_proxima_vaga_2cr.
// Copie o conteúdo DESTA constante (veja explicação no app).
export const SQL_PAUTA_2CR_COMPLETO = `-- ==============================================================
-- SCRIPT COMPLETO: PAUTA 2º CR (SLOTS + FERIADOS + RPC)
-- Execute todo esse bloco de uma só vez no Supabase → SQL Editor → New Query → Run
-- ==============================================================

-- 1) TABELA pautas_2cr_slots
CREATE TABLE IF NOT EXISTS public.pautas_2cr_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_audiencia DATE NOT NULL,
  horario TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'DISPONIVEL'
    CONSTRAINT pautas_2cr_slots_status_check
    CHECK (status IN ('DISPONIVEL','ALOCADO','BLOQUEADO')),
  numero_tco_alocado TEXT,
  rgpm_condutor TEXT,
  graduacao_condutor TEXT,
  nome_guerra_condutor TEXT,
  natureza TEXT,
  unidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pautas_2cr_slots_data_horario_unq
  ON public.pautas_2cr_slots (data_audiencia, horario);

CREATE INDEX IF NOT EXISTS pautas_2cr_slots_status_idx
  ON public.pautas_2cr_slots (status);

CREATE OR REPLACE FUNCTION public.pautas_2cr_slots_tgr_updated_at()
RETURNS trigger AS \$\$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pautas_2cr_updated_at ON public.pautas_2cr_slots;
CREATE TRIGGER trg_pautas_2cr_updated_at
BEFORE UPDATE ON public.pautas_2cr_slots
FOR EACH ROW EXECUTE FUNCTION public.pautas_2cr_slots_tgr_updated_at();

ALTER TABLE public.pautas_2cr_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pautas_2cr_slots_select_all ON public.pautas_2cr_slots;
CREATE POLICY pautas_2cr_slots_select_all ON public.pautas_2cr_slots FOR SELECT USING (true);
DROP POLICY IF EXISTS pautas_2cr_slots_write_all ON public.pautas_2cr_slots;
CREATE POLICY pautas_2cr_slots_write_all ON public.pautas_2cr_slots FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pautas_2cr_slots TO anon, authenticated;

-- 2) TABELA pautas_2cr_feriados (locais/pontos facultativos/emendas)
CREATE TABLE IF NOT EXISTS public.pautas_2cr_feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'FERIADO_LOCAL'
    CONSTRAINT pautas_2cr_feriados_tipo_check
    CHECK (tipo IN ('FERIADO_NACIONAL_MANUAL','FERIADO_LOCAL','PONTO_FACULTATIVO','EMENDA')),
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pautas_2cr_feriados_data_unq
  ON public.pautas_2cr_feriados (data);

CREATE INDEX IF NOT EXISTS pautas_2cr_feriados_tipo_idx
  ON public.pautas_2cr_feriados (tipo);

CREATE OR REPLACE FUNCTION public.pautas_2cr_feriados_tgr_updated_at()
RETURNS trigger AS \$\$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pautas_2cr_feriados_updated_at ON public.pautas_2cr_feriados;
CREATE TRIGGER trg_pautas_2cr_feriados_updated_at
BEFORE UPDATE ON public.pautas_2cr_feriados
FOR EACH ROW EXECUTE FUNCTION public.pautas_2cr_feriados_tgr_updated_at();

ALTER TABLE public.pautas_2cr_feriados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pautas_2cr_feriados_select_all ON public.pautas_2cr_feriados;
CREATE POLICY pautas_2cr_feriados_select_all ON public.pautas_2cr_feriados FOR SELECT USING (true);
DROP POLICY IF EXISTS pautas_2cr_feriados_write_all ON public.pautas_2cr_feriados;
CREATE POLICY pautas_2cr_feriados_write_all ON public.pautas_2cr_feriados FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pautas_2cr_feriados TO anon, authenticated;

-- Seeds: feriados regionais MT / Várzea Grande (2º CR) — se quiser ajuste depois
INSERT INTO public.pautas_2cr_feriados (data, tipo, nome, descricao) VALUES
  ('2026-11-15', 'FERIADO_LOCAL', 'Aniversário de Cuiabá', 'Cuiabá/MT'),
  ('2026-05-11', 'FERIADO_LOCAL', 'Dia de Nossa Senhora da Guia', 'Festa do município de Várzea Grande/MT (padroeira)'),
  ('2026-06-24', 'PONTO_FACULTATIVO', 'São João — MT', 'Ponto facultativo referente ao festejo junino no interior')
ON CONFLICT (data) DO NOTHING;

-- 3) RPC: alocar_proxima_vaga_2cr
CREATE OR REPLACE FUNCTION public.alocar_proxima_vaga_2cr(
  p_natureza TEXT,
  p_unidade TEXT,
  p_graduacao TEXT,
  p_nome_guerra TEXT
)
RETURNS TABLE (
  out_numero_tco BIGINT,
  out_data_audiencia TEXT,
  out_hora_audiencia TEXT
) AS \$\$
DECLARE
  v_slot_id UUID;
  v_data DATE;
  v_horario TIME;
  v_prox_num BIGINT;
  v_ano INT := EXTRACT(YEAR FROM NOW());
BEGIN
  -- 3.1 Tabela auxiliar numeração ANUAL
  CREATE TABLE IF NOT EXISTS public.numeracao_tco_2cr (
    ano INT PRIMARY KEY,
    ultimo_numero BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE public.numeracao_tco_2cr ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS numeracao_tco_2cr_todas ON public.numeracao_tco_2cr;
  CREATE POLICY numeracao_tco_2cr_todas ON public.numeracao_tco_2cr FOR ALL
    USING (true) WITH CHECK (true);
  GRANT ALL ON TABLE public.numeracao_tco_2cr TO anon, authenticated;

  -- 3.2 Pega e trava o próximo DISPONIVEL (thread-safe)
  SELECT id, data_audiencia, horario
    INTO v_slot_id, v_data, v_horario
    FROM public.pautas_2cr_slots
   WHERE status = 'DISPONIVEL'
   ORDER BY data_audiencia ASC, horario ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF v_slot_id IS NULL THEN
    RAISE EXCEPTION 'Atenção: Não há números/vagas livres cadastradas na pauta do 2º CR.';
  END IF;

  -- 3.3 Próximo número sequencial do ano
  INSERT INTO public.numeracao_tco_2cr (ano, ultimo_numero)
  VALUES (v_ano, 0)
  ON CONFLICT (ano) DO NOTHING;

  UPDATE public.numeracao_tco_2cr
     SET ultimo_numero = ultimo_numero + 1, updated_at = NOW()
   WHERE ano = v_ano
   RETURNING ultimo_numero INTO v_prox_num;

  -- 3.4 Marca slot como ALOCADO
  UPDATE public.pautas_2cr_slots
     SET status             = 'ALOCADO',
         numero_tco_alocado = v_prox_num::TEXT,
         rgpm_condutor      = NULLIF(CURRENT_SETTING('app.rgpm_condutor', true), ''),
         graduacao_condutor = p_graduacao,
         nome_guerra_condutor = p_nome_guerra,
         natureza           = p_natureza,
         unidade            = p_unidade
   WHERE id = v_slot_id;

  out_numero_tco    := v_prox_num;
  out_data_audiencia := TO_CHAR(v_data, 'DD/MM/YYYY');
  out_hora_audiencia := TO_CHAR(v_horario, 'HH24:MI');
  RETURN NEXT;
END;
\$\$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.alocar_proxima_vaga_2cr(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alocar_proxima_vaga_2cr(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
`;

export const TABELAS_PAUTA_2CR = [
  "pautas_2cr_slots",
  "pautas_2cr_feriados",
  "alocar_proxima_vaga_2cr",
] as const;

export const erroPauta2crAusente = (mensagem?: string | null, detalhes?: string | null, hint?: string | null): boolean => {
  const s = `${mensagem || ""} ${detalhes || ""} ${hint || ""}`.toLowerCase();
  if (!s.trim()) return false;
  return (
    s.includes("pautas_2cr_slots") ||
    s.includes("pautas_2cr_feriados") ||
    s.includes("alocar_proxima_vaga_2cr") ||
    s.includes("could not find the table") ||
    s.includes("schema cache") ||
    s.includes("pgrst205") ||
    /relation ["']pautas_2cr_/.test(s) ||
    /function .*alocar_proxima_vaga_2cr.*does not exist/.test(s)
  );
};

export const copiarTexto = async (texto: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
};
