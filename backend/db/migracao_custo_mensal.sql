-- ════════════════════════════════════════════════════════════
--  PROMAD · Migração — adiciona campo custo_mensal
--  Execute no Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- Adiciona coluna custo_mensal (valor cobrado da empresa — indiretos)
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS custo_mensal NUMERIC(10,2);

-- Renomeia sal para ficar claro que é salário CLT
-- (sal já existe, apenas documentamos a distinção)
COMMENT ON COLUMN contratos.sal         IS 'Salário CLT do aprendiz';
COMMENT ON COLUMN contratos.custo_mensal IS 'Custo mensal cobrado da empresa (contratos indiretos)';

-- Para contratos indiretos já importados que usaram sal como custo:
-- migrar o valor de sal para custo_mensal se tipo_ct = indireto
UPDATE contratos
SET custo_mensal = sal, sal = NULL
WHERE tipo_ct = 'indireto' AND sal IS NOT NULL AND custo_mensal IS NULL;

-- Verificação
SELECT tipo_ct, COUNT(*) AS total,
       COUNT(sal) AS com_salario_clt,
       COUNT(custo_mensal) AS com_custo_mensal
FROM contratos
GROUP BY tipo_ct;
