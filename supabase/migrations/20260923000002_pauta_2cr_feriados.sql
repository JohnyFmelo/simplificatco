-- ==============================================================
-- TABELA pautas_2cr_feriados: Cadastro manual de feriados locais,
-- pontos facultativos e emendas do 2º CR (Várzea Grande/Cuiabá/MT).
-- ==============================================================

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

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.pautas_2cr_feriados_tgr_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pautas_2cr_feriados_updated_at ON public.pautas_2cr_feriados;
CREATE TRIGGER trg_pautas_2cr_feriados_updated_at
BEFORE UPDATE ON public.pautas_2cr_feriados
FOR EACH ROW EXECUTE FUNCTION public.pautas_2cr_feriados_tgr_updated_at();

ALTER TABLE public.pautas_2cr_feriados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pautas_2cr_feriados_select_all ON public.pautas_2cr_feriados;
CREATE POLICY pautas_2cr_feriados_select_all
  ON public.pautas_2cr_feriados FOR SELECT
  USING (true);

DROP POLICY IF EXISTS pautas_2cr_feriados_write_all ON public.pautas_2cr_feriados;
CREATE POLICY pautas_2cr_feriados_write_all
  ON public.pautas_2cr_feriados FOR ALL
  USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.pautas_2cr_feriados TO anon, authenticated;

-- ==============================================================
-- Seeds: alguns feriados estaduais do MT + cidade de Várzea Grande
-- (Ajuste conforme necessidade da chefia do 2º CR)
-- ==============================================================
INSERT INTO public.pautas_2cr_feriados (data, tipo, nome, descricao) VALUES
  ('2026-11-15', 'FERIADO_LOCAL', 'Aniversário de Cuiabá', 'Cuiabá/MT'),
  ('2026-05-11', 'FERIADO_LOCAL', 'Dia de Nossa Senhora da Guia', 'Festa do município de Várzea Grande/MT (padroeira)'),
  ('2026-06-24', 'PONTO_FACULTATIVO', 'São João — MT', 'Ponto facultativo referente ao festejo junino no interior')
ON CONFLICT (data) DO NOTHING;
