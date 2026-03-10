// ═══════════════════════════════════════════
//  PROMAD · Rotas — Férias
//  Arquivo: backend/routes/ferias.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = `SELECT f.*, a.nom AS ap_nom, e.nom AS em_nom
               FROM ferias f
               JOIN aprendizes a ON a.id=f.ap
               LEFT JOIN empresas e ON e.id=a.emp
               WHERE 1=1`;
    const params = [];
    if (q) { params.push(`%${q}%`); sql += ` AND a.nom ILIKE $1`; }
    sql += ' ORDER BY f.criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar férias.' }); }
});

router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `INSERT INTO ferias (ap,ini,fim,obs) VALUES ($1,$2,$3,$4) RETURNING *`,
      [f.ap, f.ini||null, f.fim||null, f.obs||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao registrar férias.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ferias WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro ao excluir férias.' }); }
});

module.exports = router;
