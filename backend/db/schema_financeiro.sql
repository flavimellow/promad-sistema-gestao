-- ═══════════════════════════════════════════
--  PROMAD · Módulo Financeiro — Novas tabelas
--  Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════

-- ────────────────────────────────────────────
--  COMPETÊNCIAS (mês de referência)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competencias (
  id          SERIAL PRIMARY KEY,
  mes         INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano         INTEGER NOT NULL,
  descricao   VARCHAR(50),   -- ex: "Fevereiro 2026"
  fechado     BOOLEAN DEFAULT FALSE,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mes, ano)
);

-- ────────────────────────────────────────────
--  TABELA DE PREÇOS (configurável)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS precos (
  id           SERIAL PRIMARY KEY,
  descricao    VARCHAR(100) NOT NULL,  -- ex: "Curso Direto", "Uniforme", "Material Didático"
  tipo         VARCHAR(30)  NOT NULL,  -- 'curso_direto' | 'uniforme' | 'material' | 'indireto_20h' | 'indireto_30h'
  valor        NUMERIC(10,2) NOT NULL,
  vigencia_ini DATE,
  vigencia_fim DATE,
  ativo        BOOLEAN DEFAULT TRUE,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- Preços padrão baseados nas planilhas
INSERT INTO precos (descricao, tipo, valor, vigencia_ini, ativo) VALUES
  ('Curso Direto',         'curso_direto',   209.90, '2025-01-01', TRUE),
  ('Uniforme',             'uniforme',       187.90, '2025-01-01', TRUE),
  ('Material Didático',    'material',        42.00, '2025-01-01', TRUE),
  ('Indireto 20h/semana',  'indireto_20h',  1594.10, '2025-01-01', TRUE),
  ('Indireto 30h/semana',  'indireto_30h',  2211.70, '2025-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────
--  COBRANÇAS (lançamentos mensais por aprendiz)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cobrancas (
  id              SERIAL PRIMARY KEY,
  competencia_id  INTEGER NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  contrato_id     INTEGER NOT NULL REFERENCES contratos(id)    ON DELETE CASCADE,
  ap_id           INTEGER NOT NULL REFERENCES aprendizes(id)   ON DELETE CASCADE,
  em_id           INTEGER NOT NULL REFERENCES empresas(id)     ON DELETE CASCADE,

  -- Tipo do contrato
  tipo_contrato   VARCHAR(20) NOT NULL CHECK (tipo_contrato IN ('direto','indireto')),

  -- Valores calculados/informados
  vl_curso        NUMERIC(10,2) DEFAULT 0,   -- curso ou custo mensal indireto
  vl_uniforme     NUMERIC(10,2) DEFAULT 0,   -- cobrado no mês de entrega
  vl_material     NUMERIC(10,2) DEFAULT 0,   -- cobrado no 1º mês
  vl_total        NUMERIC(10,2) DEFAULT 0,   -- calculado: soma dos três

  -- Controle de carga horária (indireto)
  carga_horaria   VARCHAR(20),               -- '20h', '30h', 'outro'
  vl_manual       BOOLEAN DEFAULT FALSE,     -- TRUE se valor foi inserido manualmente

  -- NF
  nf_numero       VARCHAR(20),
  nf_emitida      BOOLEAN DEFAULT FALSE,

  -- Status de pagamento
  sta_pgto        VARCHAR(20) DEFAULT 'pendente' CHECK (sta_pgto IN ('pendente','pago','atrasado')),
  dt_pgto         DATE,

  obs             TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (competencia_id, contrato_id)  -- 1 cobrança por contrato por mês
);

-- Trigger atualizado_em
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cobrancas_upd
  BEFORE UPDATE ON cobrancas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Índices
CREATE INDEX IF NOT EXISTS idx_cob_comp  ON cobrancas(competencia_id);
CREATE INDEX IF NOT EXISTS idx_cob_em    ON cobrancas(em_id);
CREATE INDEX IF NOT EXISTS idx_cob_ap    ON cobrancas(ap_id);
CREATE INDEX IF NOT EXISTS idx_cob_sta   ON cobrancas(sta_pgto);
