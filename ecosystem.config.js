// ═══════════════════════════════════════════
//  PROMAD · Configuração PM2
//  Arquivo: ecosystem.config.js
//  Uso: pm2 start ecosystem.config.js
// ═══════════════════════════════════════════
module.exports = {
  apps: [
    {
      name: 'promad',
      script: 'backend/server.js',
      instances: 1,           // aumente para 'max' se tiver múltiplos CPUs
      exec_mode: 'fork',      // use 'cluster' com instances: 'max'
      watch: false,           // não fazer watch em produção
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs
      out_file: './logs/pm2_out.log',
      error_file: './logs/pm2_err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Reiniciar se cair
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
