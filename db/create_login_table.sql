CREATE TABLE IF NOT EXISTS usuarios_login (
  id BIGSERIAL PRIMARY KEY,
  rgpm VARCHAR(12) NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  cr TEXT NOT NULL,
  unidade TEXT NOT NULL,
  nivel_acesso TEXT NOT NULL CHECK (nivel_acesso IN ('Administrador','Operacional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_usuarios_login_rgpm ON usuarios_login (rgpm);