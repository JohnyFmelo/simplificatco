-- Tabela para armazenar avaliações e feedback
create table if not exists public.avaliacoes (
  id uuid default gen_random_uuid() primary key,
  stars integer not null check (stars >= 1 and stars <= 5),
  text text,
  date timestamptz default now() not null
);

-- Habilitar RLS (Row Level Security)
alter table public.avaliacoes enable row level security;

-- Política para permitir que qualquer pessoa insira avaliações
create policy "Permitir inserção para todos" 
on public.avaliacoes 
for insert 
with check (true);

-- Política para permitir que todos vejam as avaliações
create policy "Permitir leitura para todos" 
on public.avaliacoes 
for select 
using (true);
