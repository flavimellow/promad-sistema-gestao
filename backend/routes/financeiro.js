// ═══════════════════════════════════════════
//  PROMAD · Rotas — Módulo Financeiro
//  Arquivo: backend/routes/financeiro.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// ── Helpers ──────────────────────────────
function nomesMes() {
  return ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
}

// ════════════════════════════════════════
//  COMPETÊNCIAS
// ════════════════════════════════════════

// GET /api/financeiro/competencias
router.get('/competencias', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM competencias ORDER BY ano DESC, mes DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// POST /api/financeiro/competencias
router.post('/competencias', async (req, res) => {
  try {
    const { mes, ano } = req.body;
    const desc = `${nomesMes()[mes]} ${ano}`;
    const { rows } = await pool.query(
      `INSERT INTO competencias (mes, ano, descricao)
       VALUES ($1, $2, $3)
       ON CONFLICT (mes, ano) DO UPDATE SET descricao = EXCLUDED.descricao
       RETURNING *`,
      [mes, ano, desc]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ════════════════════════════════════════
//  PREÇOS
// ════════════════════════════════════════

// GET /api/financeiro/precos
router.get('/precos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM precos WHERE ativo = TRUE ORDER BY tipo'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// PUT /api/financeiro/precos/:id
router.put('/precos/:id', async (req, res) => {
  try {
    const { valor, descricao } = req.body;
    const { rows } = await pool.query(
      'UPDATE precos SET valor=$1, descricao=$2 WHERE id=$3 RETURNING *',
      [valor, descricao, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ════════════════════════════════════════
//  COBRANÇAS
// ════════════════════════════════════════

// GET /api/financeiro/cobrancas?comp_id=X&tipo=direto|indireto
router.get('/cobrancas', async (req, res) => {
  try {
    const { comp_id, tipo } = req.query;
    if (!comp_id) return res.status(400).json({ erro: 'comp_id obrigatório' });

    let sql = `
      SELECT cb.*,
             a.nom AS ap_nom, a.mat AS ap_mat,
             e.nom AS em_nom, e.cnj AS em_cnj,
             ct.ini AS ct_ini, ct.fim AS ct_fim, ct.ch AS ct_ch
      FROM cobrancas cb
      JOIN aprendizes a  ON a.id  = cb.ap_id
      JOIN empresas   e  ON e.id  = cb.em_id
      JOIN contratos  ct ON ct.id = cb.contrato_id
      WHERE cb.competencia_id = $1
    `;
    const params = [comp_id];
    if (tipo) { params.push(tipo); sql += ` AND cb.tipo_contrato = $${params.length}`; }
    sql += ' ORDER BY e.nom, a.nom';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// POST /api/financeiro/gerar — gera cobranças de uma competência
router.post('/gerar', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { comp_id } = req.body;
    if (!comp_id) throw new Error('comp_id obrigatório');

    // Buscar competência
    const { rows: comps } = await client.query(
      'SELECT * FROM competencias WHERE id=$1', [comp_id]
    );
    if (!comps.length) throw new Error('Competência não encontrada');
    const comp = comps[0];
    const primeiroDia = new Date(comp.ano, comp.mes - 1, 1);
    const ultimoDia  = new Date(comp.ano, comp.mes, 0);

    // Buscar preços vigentes
    const { rows: precos } = await client.query(
      'SELECT tipo, valor FROM precos WHERE ativo = TRUE'
    );
    const P = {};
    precos.forEach(p => P[p.tipo] = parseFloat(p.valor));

    // Buscar todos contratos vigentes no período
    const { rows: contratos } = await client.query(`
      SELECT ct.*, a.nom AS ap_nom, e.nom AS em_nom, e.cnj AS em_cnj,
             ct.ini AS ct_ini
      FROM contratos ct
      JOIN aprendizes a ON a.id = ct.ap
      JOIN empresas   e ON e.id = ct.em
      WHERE ct.sta = 'Vigente'
        AND (ct.ini IS NULL OR ct.ini <= $2)
        AND (ct.fim IS NULL OR ct.fim >= $1)
    `, [primeiroDia, ultimoDia]);

    let geradas = 0;
    let ignoradas = 0;

    for (const ct of contratos) {
      // Verificar se já existe cobrança para esse contrato nessa competência
      const { rows: exist } = await client.query(
        'SELECT id FROM cobrancas WHERE competencia_id=$1 AND contrato_id=$2',
        [comp_id, ct.id]
      );
      if (exist.length) { ignoradas++; continue; }

      // Usar tipo_ct do contrato
      const tipo = ct.tipo_ct || 'direto';

      // Calcular custo do curso
      let vl_curso = 0;
      let carga = null;
      if (tipo === 'direto') {
        vl_curso = P['curso_direto'] || 209.90;
      } else {
        const ch = parseFloat(ct.ch) || 0;
        carga = ch <= 20 ? '20h' : ch <= 30 ? '30h' : 'outro';
        if (carga === '20h')      vl_curso = P['indireto_20h'] || 1594.10;
        else if (carga === '30h') vl_curso = P['indireto_30h'] || 2211.70;
        else                      vl_curso = parseFloat(ct.sal) || 0;
      }

      // Verificar se é 1º mês do contrato → cobrar material didático
      let vl_material = 0;
      if (ct.ct_ini) {
        const iniDate = new Date(ct.ct_ini);
        if (iniDate.getMonth() === primeiroDia.getMonth() &&
            iniDate.getFullYear() === primeiroDia.getFullYear()) {
          vl_material = P['material'] || 42.00;
        }
      }

      // Verificar uniforme entregue neste mês
      const { rows: unifs } = await client.query(`
        SELECT COALESCE(SUM(qtd), 0) AS qtd
        FROM uniformes
        WHERE ap = $1
          AND dat >= $2 AND dat <= $3
      `, [ct.ap, primeiroDia, ultimoDia]);
      const qtdUnif = parseInt(unifs[0].qtd) || 0;
      const vl_uniforme = qtdUnif > 0 ? (P['uniforme'] || 187.90) : 0;

      const vl_total = vl_curso + vl_uniforme + vl_material;

      await client.query(`
        INSERT INTO cobrancas
          (competencia_id, contrato_id, ap_id, em_id, tipo_contrato,
           vl_curso, vl_uniforme, vl_material, vl_total,
           carga_horaria, vl_manual)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [comp_id, ct.id, ct.ap, ct.em, tipo,
          vl_curso, vl_uniforme, vl_material, vl_total,
          carga, false]);
      geradas++;
    }

    await client.query('COMMIT');
    res.json({ geradas, ignoradas, total: geradas + ignoradas });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao gerar cobranças:', err.message);
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/financeiro/cobrancas/:id — editar cobrança manualmente
router.put('/cobrancas/:id', async (req, res) => {
  try {
    const f = req.body;
    const vl_total = (parseFloat(f.vl_curso)||0) + (parseFloat(f.vl_uniforme)||0) + (parseFloat(f.vl_material)||0);
    const { rows } = await pool.query(`
      UPDATE cobrancas SET
        vl_curso=$1, vl_uniforme=$2, vl_material=$3, vl_total=$4,
        carga_horaria=$5, vl_manual=TRUE, nf_numero=$6,
        sta_pgto=$7, dt_pgto=$8, obs=$9
      WHERE id=$10 RETURNING *`,
      [f.vl_curso||0, f.vl_uniforme||0, f.vl_material||0, vl_total,
       f.carga_horaria||null, f.nf_numero||null,
       f.sta_pgto||'pendente', f.dt_pgto||null, f.obs||null,
       req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// DELETE /api/financeiro/cobrancas/:id
router.delete('/cobrancas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cobrancas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ════════════════════════════════════════
//  RESUMO POR EMPRESA (para tela e Excel)
// ════════════════════════════════════════
router.get('/resumo/:comp_id', async (req, res) => {
  try {
    const { tipo } = req.query; // direto | indireto | (vazio = todos)
    let sql = `
      SELECT
        e.id AS em_id, e.nom AS em_nom, e.cnj AS em_cnj,
        cb.tipo_contrato,
        COUNT(cb.id)        AS qtd_aprendizes,
        SUM(cb.vl_total)    AS total_geral,
        SUM(cb.vl_curso)    AS total_curso,
        SUM(cb.vl_uniforme) AS total_uniforme,
        SUM(cb.vl_material) AS total_material,
        json_agg(json_build_object(
          'id',          cb.id,
          'ap_nom',      a.nom,
          'ap_mat',      a.mat,
          'ct_ini',      ct.ini,
          'ct_fim',      ct.fim,
          'ct_ch',       ct.ch,
          'vl_curso',    cb.vl_curso,
          'vl_uniforme', cb.vl_uniforme,
          'vl_material', cb.vl_material,
          'vl_total',    cb.vl_total,
          'vl_manual',   cb.vl_manual,
          'carga',       cb.carga_horaria,
          'nf_numero',   cb.nf_numero,
          'sta_pgto',    cb.sta_pgto
        ) ORDER BY a.nom) AS aprendizes
      FROM cobrancas cb
      JOIN empresas   e  ON e.id  = cb.em_id
      JOIN aprendizes a  ON a.id  = cb.ap_id
      JOIN contratos  ct ON ct.id = cb.contrato_id
      WHERE cb.competencia_id = $1
    `;
    const params = [req.params.comp_id];
    if (tipo) { params.push(tipo); sql += ` AND cb.tipo_contrato = $${params.length}`; }
    sql += ' GROUP BY e.id, e.nom, e.cnj, cb.tipo_contrato ORDER BY e.nom';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ════════════════════════════════════════
//  KPIs DO DASHBOARD FINANCEIRO
// ════════════════════════════════════════
router.get('/kpis/:comp_id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(DISTINCT em_id)                                   AS total_empresas,
        COUNT(*)                                                AS total_aprendizes,
        COALESCE(SUM(vl_total), 0)                              AS total_geral,
        COALESCE(SUM(CASE WHEN tipo_contrato='direto'   THEN vl_total END), 0) AS total_direto,
        COALESCE(SUM(CASE WHEN tipo_contrato='indireto' THEN vl_total END), 0) AS total_indireto,
        COUNT(CASE WHEN sta_pgto='pago'     THEN 1 END)         AS qtd_pago,
        COUNT(CASE WHEN sta_pgto='pendente' THEN 1 END)         AS qtd_pendente,
        COUNT(CASE WHEN sta_pgto='atrasado' THEN 1 END)         AS qtd_atrasado
      FROM cobrancas
      WHERE competencia_id = $1
    `, [req.params.comp_id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

module.exports = router;
