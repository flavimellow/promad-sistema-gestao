// ═══════════════════════════════════════════
//  PROMAD · Rotas — Contratos
//  Arquivo: backend/routes/contratos.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { sta, q } = req.query;
    let sql = `
      SELECT c.*, a.nom AS ap_nom, e.nom AS em_nom
      FROM contratos c
      JOIN aprendizes a ON a.id = c.ap
      JOIN empresas   e ON e.id = c.em
      WHERE 1=1
    `;
    const params = [];
    if (sta && sta !== 'todos') { params.push(sta); sql += ` AND c.sta=$${params.length}`; }
    if (q) { params.push(`%${q}%`); sql += ` AND (a.nom ILIKE $${params.length} OR e.nom ILIKE $${params.length})`; }
    sql += ' ORDER BY c.criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar contratos.' }); }
});

router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `INSERT INTO contratos (ap,em,ini,fim,sta,hor,int,ch,sal,obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [f.ap,f.em,f.ini||null,f.fim||null,f.sta||'Vigente',f.hor||null,f.int||null,f.ch||null,f.sal||null,f.obs||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao criar contrato.' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `UPDATE contratos SET ap=$1,em=$2,ini=$3,fim=$4,sta=$5,hor=$6,int=$7,ch=$8,sal=$9,obs=$10
       WHERE id=$11 RETURNING *`,
      [f.ap,f.em,f.ini||null,f.fim||null,f.sta||'Vigente',f.hor||null,f.int||null,f.ch||null,f.sal||null,f.obs||null,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao atualizar contrato.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM contratos WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro ao excluir contrato.' }); }
});

module.exports = router;
