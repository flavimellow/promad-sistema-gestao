// ═══════════════════════════════════════════
//  PROMAD · Rotas — Licenças Médicas
//  Arquivo: backend/routes/licencas.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = `SELECT l.*, a.nom AS ap_nom FROM licencas l JOIN aprendizes a ON a.id=l.ap WHERE 1=1`;
    const params = [];
    if (q) { params.push(`%${q}%`); sql += ` AND a.nom ILIKE $1`; }
    sql += ' ORDER BY l.criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar licenças.' }); }
});

router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `INSERT INTO licencas (ap,ini,fim,mot) VALUES ($1,$2,$3,$4) RETURNING *`,
      [f.ap, f.ini||null, f.fim||null, f.mot||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao registrar licença.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM licencas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro ao excluir licença.' }); }
});

module.exports = router;
