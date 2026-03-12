-- ═══════════════════════════════════════════
--  PROMAD · Banco de Dados PostgreSQL
--  Arquivo: backend/db/schema.sql
-- ═══════════════════════════════════════════

-- Extensão para UUIDs (opcional, usando SERIAL por padrão)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────
--  EMPRESAS
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(200) NOT NULL,
  cnj        VARCHAR(20),
  res        VARCHAR(150),
  logr       VARCHAR(200),
  num        VARCHAR(20),
  bai        VARCHAR(100),
  cep        VARCHAR(9),
  tel        VARCHAR(30),
  eml        VARCHAR(150),
  obs        TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
--  APRENDIZES
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aprendizes (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(200) NOT NULL,
  mat        VARCHAR(50),
  ins        VARCHAR(50),
  nas        DATE,
  mod        VARCHAR(100),
  esc        VARCHAR(100),
  tur        VARCHAR(50),
  sta        VARCHAR(20) DEFAULT 'Ativo' CHECK (sta IN ('Ativo','Pendente','Inativo')),
  cpf        VARCHAR(14),
  -- Endereço
  logr       VARCHAR(200),
  num        VARCHAR(20),
  bai        VARCHAR(100),
  cep        VARCHAR(9),
  -- Contatos
  tre        VARCHAR(30),
  cel        VARCHAR(30),
  ttr        VARCHAR(30),
  out        VARCHAR(200),
  -- Responsável
  res        VARCHAR(150),
  par        VARCHAR(50),
  cpr        VARCHAR(14),
  -- Curso
  cni        DATE,
  cnf        DATE,
  trm        VARCHAR(50),
  -- Empresa vinculada
  emp        INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  obs        TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
--  CONTRATOS
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id         SERIAL PRIMARY KEY,
  ap         INTEGER NOT NULL REFERENCES aprendizes(id) ON DELETE CASCADE,
  em         INTEGER NOT NULL REFERENCES empresas(id)   ON DELETE CASCADE,
  ini        DATE,
  fim        DATE,
  sta        VARCHAR(20) DEFAULT 'Vigente' CHECK (sta IN ('Vigente','Encerrado')),
  hor        VARCHAR(50),
  int        VARCHAR(50),
  ch         NUMERIC(5,1),
  sal        NUMERIC(10,2),
  tipo_ct    VARCHAR(20) DEFAULT 'direto' CHECK (tipo_ct IN ('direto','indireto')),
  obs        TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
--  UNIFORMES
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uniformes (
  id         SERIAL PRIMARY KEY,
  ap         INTEGER NOT NULL REFERENCES aprendizes(id) ON DELETE CASCADE,
  dat        DATE,
  qtd        INTEGER DEFAULT 1,
  ass        VARCHAR(200),
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
--  FÉRIAS
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ferias (
  id         SERIAL PRIMARY KEY,
  ap         INTEGER NOT NULL REFERENCES aprendizes(id) ON DELETE CASCADE,
  ini        DATE,
  fim        DATE,
  obs        TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
--  LICENÇAS MÉDICAS
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licencas (
  id         SERIAL PRIMARY KEY,
  ap         INTEGER NOT NULL REFERENCES aprendizes(id) ON DELETE CASCADE,
  ini        DATE,
  fim        DATE,
  mot        TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────
--  FUNÇÃO: atualiza campo atualizado_em
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizado_em
CREATE TRIGGER trg_empresas_upd   BEFORE UPDATE ON empresas   FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_aprendizes_upd BEFORE UPDATE ON aprendizes FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_contratos_upd  BEFORE UPDATE ON contratos  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ────────────────────────────────────────────
--  ÍNDICES para performance
-- ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ap_sta  ON aprendizes(sta);
CREATE INDEX IF NOT EXISTS idx_ap_emp  ON aprendizes(emp);
CREATE INDEX IF NOT EXISTS idx_ct_ap   ON contratos(ap);
CREATE INDEX IF NOT EXISTS idx_ct_em   ON contratos(em);
CREATE INDEX IF NOT EXISTS idx_ct_sta  ON contratos(sta);
CREATE INDEX IF NOT EXISTS idx_un_ap   ON uniformes(ap);
CREATE INDEX IF NOT EXISTS idx_fe_ap   ON ferias(ap);
CREATE INDEX IF NOT EXISTS idx_li_ap   ON licencas(ap);
