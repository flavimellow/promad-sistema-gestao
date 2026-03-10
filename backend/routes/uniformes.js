// ═══════════════════════════════════════════
//  PROMAD · Rotas — Uniformes
//  Arquivo: backend/routes/uniformes.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = `SELECT u.*, a.nom AS ap_nom FROM uniformes u JOIN aprendizes a ON a.id=u.ap WHERE 1=1`;
    const params = [];
    if (q) { params.push(`%${q}%`); sql += ` AND a.nom ILIKE $1`; }
    sql += ' ORDER BY u.criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar uniformes.' }); }
});

router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `INSERT INTO uniformes (ap,dat,qtd,ass) VALUES ($1,$2,$3,$4) RETURNING *`,
      [f.ap, f.dat||null, f.qtd||1, f.ass||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao registrar uniforme.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM uniformes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro ao excluir uniforme.' }); }
});

module.exports = router;
