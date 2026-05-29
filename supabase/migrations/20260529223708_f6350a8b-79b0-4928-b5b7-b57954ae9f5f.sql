UPDATE public.militares
SET prazo_utilizacao_ate = prazo_utilizacao_ate + INTERVAL '90 days'
WHERE prazo_utilizacao_ate IS NOT NULL;