-- ==============================================================
-- 1) TABELA pautas_2cr_slots: Horários de audiência do 2º CR
--    Cada linha representa 1 horário (slot) de audiência.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.pautas_2cr_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Data e horário do slot
  data_audiencia DATE NOT NULL,
  horario TIME NOT NULL,

  -- Status do slot
  status TEXT NOT NULL DEFAULT 'DISPONIVEL'
    CONSTRAINT pautas_2cr_slots_status_check
    CHECK (status IN ('DISPONIVEL','ALOCADO','BLOQUEADO')),

  -- Dados do TCO que alocou esse slot (preenchidos no momento da alocação)
  numero_tco_alocado TEXT,
  rgpm_condutor TEXT,
  graduacao_condutor TEXT,
  nome_guerra_condutor TEXT,
  natureza TEXT,
  unidade TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices essenciais (ordem de busca + unicidade do par data+horário)
CREATE INDEX IF NOT EXISTS pautas_2cr_slots_data_idx
  ON public.pautas_2cr_slots (data_audiencia, horario);

CREATE INDEX IF NOT EXISTS pautas_2cr_slots_status_idx
  ON public.pautas_2cr_slots (status);

CREATE UNIQUE INDEX IF NOT EXISTS pautas_2cr_slots_data_horario_unq
  ON public.pautas_2cr_slots (data_audiencia, horario);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.pautas_2cr_slots_tgr_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pautas_2cr_updated_at ON public.pautas_2cr_slots;
CREATE TRIGGER trg_pautas_2cr_updated_at
BEFORE UPDATE ON public.pautas_2cr_slots
FOR EACH ROW EXECUTE FUNCTION public.pautas_2cr_slots_tgr_updated_at();

-- RLS: ativar e dar acesso público (a gestão é feita via aplicação + role admin;
-- caso queira bloquear edição de usuário não-admin, basta criar policy após login).
ALTER TABLE public.pautas_2cr_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pautas_2cr_slots_select_all ON public.pautas_2cr_slots;
CREATE POLICY pautas_2cr_slots_select_all
  ON public.pautas_2cr_slots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS pautas_2cr_slots_write_all ON public.pautas_2cr_slots;
CREATE POLICY pautas_2cr_slots_write_all
  ON public.pautas_2cr_slots FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.pautas_2cr_slots TO anon, authenticated;
GRANT ALL ON SEQUENCE (NULL) TO anon; -- placeholder p/ silenciar warnings em versões antigas

-- ==============================================================
-- 2) RPC: alocar_proxima_vaga_2cr(...)
--    Retorna o próximo slot DISPONIVEL por ordem de data+horário,
--    marca como ALOCADO e grava os dados do condutor/natureza/unidade.
-- ==============================================================

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
) AS $$
DECLARE
  v_slot_id UUID;
  v_data DATE;
  v_horario TIME;
  v_existe_contador INT;
  v_prox_num BIGINT;
  v_ano INT := EXTRACT(YEAR FROM NOW());
BEGIN
  -- 2.1) Garante que a tabela auxiliar de contadores (numeracao_tco_2cr) exista
  --      (numeracao sequencial por ANO — reinicia em janeiro de cada ano)
  CREATE TABLE IF NOT EXISTS public.numeracao_tco_2cr (
    ano INT PRIMARY KEY,
    ultimo_numero BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE public.numeracao_tco_2cr ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS numeracao_tco_2cr_todas ON public.numeracao_tco_2cr;
  CREATE POLICY numeracao_tco_2cr_todas
    ON public.numeracao_tco_2cr FOR ALL
    USING (true) WITH CHECK (true);

  GRANT ALL ON TABLE public.numeracao_tco_2cr TO anon, authenticated;

  -- 2.2) Busca e bloqueia o próximo slot DISPONIVEL mais antigo
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

  -- 2.3) Pega o próximo número sequencial do ano atual
  SELECT COUNT(*) INTO v_existe_contador
    FROM public.numeracao_tco_2cr WHERE ano = v_ano;

  IF v_existe_contador = 0 THEN
    INSERT INTO public.numeracao_tco_2cr(ano, ultimo_numero)
    VALUES (v_ano, 0);
  END IF;

  UPDATE public.numeracao_tco_2cr
     SET ultimo_numero = ultimo_numero + 1,
         updated_at = NOW()
   WHERE ano = v_ano
   RETURNING ultimo_numero INTO v_prox_num;

  -- 2.4) Marca o slot como ALOCADO e grava os metadados do TCO
  UPDATE public.pautas_2cr_slots
     SET status             = 'ALOCADO',
         numero_tco_alocado = v_prox_num::TEXT,
         rgpm_condutor      = NULLIF(CURRENT_SETTING('app.rgpm_condutor', true), ''),
         graduacao_condutor = p_graduacao,
         nome_guerra_condutor = p_nome_guerra,
         natureza           = p_natureza,
         unidade            = p_unidade
   WHERE id = v_slot_id;

  -- 2.5) Retorna para o front
  out_numero_tco    := v_prox_num;
  out_data_audiencia := TO_CHAR(v_data, 'DD/MM/YYYY');
  out_hora_audiencia := TO_CHAR(v_horario, 'HH24:MI');
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.alocar_proxima_vaga_2cr(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alocar_proxima_vaga_2cr(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
