// ═══════════════════════════════════════════
//  PROMAD · Rotas — Aprendizes
//  Arquivo: backend/routes/aprendizes.js
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// GET /api/aprendizes  — listar (com filtro opcional ?sta=Ativo&q=nome)
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
    if (sta && sta !== 'todos') {
      params.push(sta);
      sql += ` AND a.sta = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (a.nom ILIKE $${params.length} OR a.mat ILIKE $${params.length})`;
    }
    sql += ' ORDER BY a.criado_em DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar aprendizes.' });
  }
});

// GET /api/aprendizes/:id  — buscar um
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, e.nom AS emp_nom
       FROM aprendizes a
       LEFT JOIN empresas e ON e.id = a.emp
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar aprendiz.' });
  }
});

// POST /api/aprendizes  — criar
router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `INSERT INTO aprendizes
        (nom,mat,ins,nas,mod,esc,tur,sta,end,num,bai,tre,cel,ttr,out,res,par,cni,cnf,trm,emp,obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [f.nom,f.mat||null,f.ins||null,f.nas||null,f.mod||null,f.esc||null,f.tur||null,
       f.sta||'Ativo',f.end||null,f.num||null,f.bai||null,f.tre||null,f.cel||null,
       f.ttr||null,f.out||null,f.res||null,f.par||null,f.cni||null,f.cnf||null,
       f.trm||null,f.emp||null,f.obs||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar aprendiz.' });
  }
});

// PUT /api/aprendizes/:id  — atualizar
router.put('/:id', async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await pool.query(
      `UPDATE aprendizes SET
        nom=$1,mat=$2,ins=$3,nas=$4,mod=$5,esc=$6,tur=$7,sta=$8,
        end=$9,num=$10,bai=$11,tre=$12,cel=$13,ttr=$14,out=$15,
        res=$16,par=$17,cni=$18,cnf=$19,trm=$20,emp=$21,obs=$22
       WHERE id=$23 RETURNING *`,
      [f.nom,f.mat||null,f.ins||null,f.nas||null,f.mod||null,f.esc||null,f.tur||null,
       f.sta||'Ativo',f.end||null,f.num||null,f.bai||null,f.tre||null,f.cel||null,
       f.ttr||null,f.out||null,f.res||null,f.par||null,f.cni||null,f.cnf||null,
       f.trm||null,f.emp||null,f.obs||null,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar aprendiz.' });
  }
});

// DELETE /api/aprendizes/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM aprendizes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir aprendiz.' });
  }
});

module.exports = router;
