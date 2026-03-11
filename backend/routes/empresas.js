// ═══════════════════════════════════════════
//  PROMAD · Rotas — Empresas
//  Arquivo: backend/routes/empresas.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM empresas WHERE 1=1';
    const params = [];
    if (q) { params.push(`%${q}%`); sql += ` AND (nom ILIKE $1 OR cnj ILIKE $1)`; }
    sql += ' ORDER BY criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar empresas.' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM empresas WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar empresa.' }); }
});

router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `INSERT INTO empresas (nom,cnj,res,logr,num,bai,cep,tel,eml,obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [f.nom,f.cnj||null,f.res||null,f.logr||null,f.num||null,f.bai||null,f.cep||null,f.tel||null,f.eml||null,f.obs||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao criar empresa.' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `UPDATE empresas SET nom=$1,cnj=$2,res=$3,logr=$4,num=$5,bai=$6,cep=$7,tel=$8,eml=$9,obs=$10
       WHERE id=$11 RETURNING *`,
      [f.nom,f.cnj||null,f.res||null,f.logr||null,f.num||null,f.bai||null,f.cep||null,f.tel||null,f.eml||null,f.obs||null,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao atualizar empresa.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM empresas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro ao excluir empresa.' }); }
});

module.exports = router;
