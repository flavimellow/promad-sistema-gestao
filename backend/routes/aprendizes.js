// ═══════════════════════════════════════════
//  PROMAD · Rotas — Aprendizes
//  Arquivo: backend/routes/aprendizes.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { sta, q } = req.query;
    let sql = `
      SELECT a.*, e.nom AS emp_nom
      FROM aprendizes a
      LEFT JOIN empresas e ON e.id = a.emp
      WHERE 1=1
    `;
    const params = [];
    if (sta && sta !== 'todos') { params.push(sta); sql += ` AND a.sta = $${params.length}`; }
    if (q) { params.push(`%${q}%`); sql += ` AND (a.nom ILIKE $${params.length} OR a.mat ILIKE $${params.length})`; }
    sql += ' ORDER BY a.criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET aprendizes:', err.message);
    res.status(500).json({ erro: 'Erro ao listar aprendizes.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, e.nom AS emp_nom FROM aprendizes a LEFT JOIN empresas e ON e.id = a.emp WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar aprendiz.' }); }
});

router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `INSERT INTO aprendizes
        (nom,mat,ins,cpf,nas,mod,esc,tur,sta,logr,num,bai,cep,tre,cel,ttr,out,res,par,cpr,cni,cnf,trm,emp,obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [f.nom,f.mat||null,f.ins||null,f.cpf||null,f.nas||null,f.mod||null,f.esc||null,f.tur||null,
       f.sta||'Ativo',f.logr||null,f.num||null,f.bai||null,f.cep||null,f.tre||null,f.cel||null,
       f.ttr||null,f.out||null,f.res||null,f.par||null,f.cpr||null,f.cni||null,f.cnf||null,
       f.trm||null,f.emp||null,f.obs||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST aprendizes:', err.message);
    res.status(500).json({ erro: 'Erro ao criar aprendiz: ' + err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `UPDATE aprendizes SET
        nom=$1,mat=$2,ins=$3,cpf=$4,nas=$5,mod=$6,esc=$7,tur=$8,sta=$9,
        logr=$10,num=$11,bai=$12,cep=$13,tre=$14,cel=$15,ttr=$16,out=$17,
        res=$18,par=$19,cpr=$20,cni=$21,cnf=$22,trm=$23,emp=$24,obs=$25
       WHERE id=$26 RETURNING *`,
      [f.nom,f.mat||null,f.ins||null,f.cpf||null,f.nas||null,f.mod||null,f.esc||null,f.tur||null,
       f.sta||'Ativo',f.logr||null,f.num||null,f.bai||null,f.cep||null,f.tre||null,f.cel||null,
       f.ttr||null,f.out||null,f.res||null,f.par||null,f.cpr||null,f.cni||null,f.cnf||null,
       f.trm||null,f.emp||null,f.obs||null,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT aprendizes:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar aprendiz.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM aprendizes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro ao excluir aprendiz.' }); }
});

module.exports = router;
