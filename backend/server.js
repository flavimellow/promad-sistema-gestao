// ═══════════════════════════════════════════
//  PROMAD · Servidor Express
//  Arquivo: backend/server.js
// ═══════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const pool    = require('./db/pool');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──
app.use(cors());
app.use(express.json());

// ── Log de todas as requisições ──
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Servir frontend estático ──
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Rotas API ──
app.use('/api/aprendizes', require('./routes/aprendizes'));
app.use('/api/empresas',   require('./routes/empresas'));
app.use('/api/contratos',  require('./routes/contratos'));
app.use('/api/uniformes',  require('./routes/uniformes'));
app.use('/api/ferias',     require('./routes/ferias'));
app.use('/api/licencas',   require('./routes/licencas'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/financeiro', require('./routes/financeiro_export'));

// ── Dashboard KPIs ──
app.get('/api/dashboard', async (req, res) => {
  try {
    const [ativos, pendentes, empresas, contratos] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM aprendizes WHERE sta='Ativo'"),
      pool.query("SELECT COUNT(*) FROM aprendizes WHERE sta='Pendente'"),
      pool.query('SELECT COUNT(*) FROM empresas'),
      pool.query('SELECT COUNT(*) FROM contratos'),
    ]);
    res.json({
      ativos:    parseInt(ativos.rows[0].count),
      pendentes: parseInt(pendentes.rows[0].count),
      empresas:  parseInt(empresas.rows[0].count),
      contratos: parseInt(contratos.rows[0].count),
    });
  } catch (err) {
    console.error('Erro dashboard:', err.message);
    res.status(500).json({ erro: 'Erro ao carregar dashboard.' });
  }
});

// ── Health check ──
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as agora');
    res.json({ status: 'ok', db: 'conectado', hora: result.rows[0].agora });
  } catch (err) {
    console.error('Health check falhou:', err.message);
    res.status(500).json({ status: 'erro', db: 'desconectado', detalhe: err.message });
  }
});

// ── Erro global ──
app.use((err, req, res, next) => {
  console.error('Erro global:', err.message);
  res.status(500).json({ erro: err.message });
});

// ── SPA fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Start ──
app.listen(PORT, async () => {
  console.log(`\n🟢 PROMAD rodando na porta ${PORT}`);
  console.log(`   Ambiente  : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DATABASE_URL definida: ${!!process.env.DATABASE_URL}`);
  try {
    await pool.query('SELECT NOW()');
    console.log('   ✅ Banco de dados: CONECTADO\n');
  } catch (err) {
    console.error('   ❌ Banco de dados: ERRO -', err.message, '\n');
  }
});
