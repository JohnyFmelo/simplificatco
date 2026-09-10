UPDATE public.militares
SET prazo_utilizacao_ate = CASE
  WHEN prazo_utilizacao_ate IS NOT NULL THEN prazo_utilizacao_ate + INTERVAL '6 months'
  ELSE CURRENT_DATE + INTERVAL '6 months'
END,
    prazo_utilizacao_definido_em = COALESCE(prazo_utilizacao_definido_em, now());