INSERT INTO public.unidades (
  nome_oficial, abreviacao, tipo, cr, possui_forca_tatica,
  logradouro, numero_endereco, bairro, cidade, uf, cep, ativa
) VALUES (
  'Raio 2º Comando Regional', 'Raio2CR', 'OUTRO', '2º CR', true,
  'Av. Filinto Muller', '538', 'Centro', 'Várzea Grande', 'MT', '78.110-100', true
)
ON CONFLICT ON CONSTRAINT unidades_abreviacao_unq DO UPDATE SET
  nome_oficial = EXCLUDED.nome_oficial,
  tipo = EXCLUDED.tipo,
  cr = EXCLUDED.cr,
  possui_forca_tatica = EXCLUDED.possui_forca_tatica,
  logradouro = EXCLUDED.logradouro,
  numero_endereco = EXCLUDED.numero_endereco,
  bairro = EXCLUDED.bairro,
  cidade = EXCLUDED.cidade,
  uf = EXCLUDED.uf,
  cep = EXCLUDED.cep,
  ativa = EXCLUDED.ativa;