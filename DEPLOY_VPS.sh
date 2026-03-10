# PROMAD · Deploy em VPS Ubuntu
# Guia completo: PostgreSQL + Node.js + PM2 + Nginx

# ═══════════════════════════════════════════════════
# PRÉ-REQUISITOS
# - VPS com Ubuntu 22.04 LTS
# - Acesso root via SSH
# - Domínio apontando para o IP da VPS (opcional)
# ═══════════════════════════════════════════════════


# ───────────────────────────────────────────────────
# PASSO 1 — Atualizar o sistema
# ───────────────────────────────────────────────────
ssh root@SEU_IP_DA_VPS

apt update && apt upgrade -y
apt install -y curl wget git unzip ufw


# ───────────────────────────────────────────────────
# PASSO 2 — Instalar Node.js 20 LTS
# ───────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
node -v   # deve mostrar v20.x.x
npm -v    # deve mostrar 10.x.x


# ───────────────────────────────────────────────────
# PASSO 3 — Instalar PostgreSQL 16
# ───────────────────────────────────────────────────
apt install -y postgresql postgresql-contrib

# Iniciar e habilitar serviço
systemctl start postgresql
systemctl enable postgresql

# Verificar status
systemctl status postgresql


# ───────────────────────────────────────────────────
# PASSO 4 — Configurar banco de dados
# ───────────────────────────────────────────────────

# Entrar como usuário postgres
sudo -u postgres psql

# Dentro do psql — executar os comandos abaixo:
CREATE DATABASE promad;
CREATE USER promad_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE promad TO promad_user;
\c promad
GRANT ALL ON SCHEMA public TO promad_user;
\q

# Testar conexão (fora do psql)
psql -U promad_user -d promad -h localhost -W
# Digite a senha e deve conectar — saia com \q


# ───────────────────────────────────────────────────
# PASSO 5 — Criar usuário do sistema (não usar root)
# ───────────────────────────────────────────────────
adduser promad
usermod -aG sudo promad

# Trocar para o novo usuário
su - promad


# ───────────────────────────────────────────────────
# PASSO 6 — Fazer upload do projeto
# ───────────────────────────────────────────────────

# OPÇÃO A — Upload direto via scp (do seu computador):
# scp -r promad-full/ promad@SEU_IP:/home/promad/promad

# OPÇÃO B — Via Git (recomendado):
cd /home/promad
git clone https://github.com/SEU_USUARIO/promad.git promad
# ou apenas copie os arquivos para /home/promad/promad

# OPÇÃO C — Upload via zip + extrair:
# scp promad_completo.zip promad@SEU_IP:/home/promad/
# unzip promad_completo.zip
# mv promad-full promad


# ───────────────────────────────────────────────────
# PASSO 7 — Configurar variáveis de ambiente
# ───────────────────────────────────────────────────
cd /home/promad/promad

cp .env.example .env
nano .env

# Edite o arquivo .env com estas informações:
# ┌─────────────────────────────────────────────────┐
# │ DATABASE_URL=postgresql://promad_user:SUA_SENHA_FORTE_AQUI@localhost:5432/promad
# │ PORT=3000
# │ NODE_ENV=production
# └─────────────────────────────────────────────────┘

# Salvar: Ctrl+O  →  Enter  →  Ctrl+X


# ───────────────────────────────────────────────────
# PASSO 8 — Criar tabelas no banco
# ───────────────────────────────────────────────────
cd /home/promad/promad

# Instalar dependências primeiro
npm install --production

# Criar tabelas
psql -U promad_user -d promad -h localhost -W -f backend/db/schema.sql
# Digite a senha quando solicitado


# ───────────────────────────────────────────────────
# PASSO 9 — Instalar e configurar PM2
# ───────────────────────────────────────────────────
sudo npm install -g pm2

# Iniciar a aplicação com PM2
cd /home/promad/promad
pm2 start backend/server.js --name promad

# Salvar configuração para reiniciar automaticamente após reboot
pm2 save
pm2 startup

# O comando acima vai mostrar um comando para executar como root
# Exemplo: sudo env PATH=... pm2 startup systemd -u promad --hp /home/promad
# COPIE e execute esse comando como root

# Verificar se está rodando
pm2 status
pm2 logs promad --lines 20


# ───────────────────────────────────────────────────
# PASSO 10 — Instalar e configurar Nginx
# ───────────────────────────────────────────────────
sudo apt install -y nginx

# Criar configuração do site
sudo nano /etc/nginx/sites-available/promad

# ┌─────────────────────────────────────────────────┐
# Cole o conteúdo abaixo no arquivo:

server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;
    # Se não tiver domínio, use: server_name _;

    # Logs
    access_log /var/log/nginx/promad_access.log;
    error_log  /var/log/nginx/promad_error.log;

    # Tamanho máximo de upload
    client_max_body_size 10M;

    # Proxy para o Node.js
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
# └─────────────────────────────────────────────────┘

# Salvar: Ctrl+O → Enter → Ctrl+X

# Ativar o site
sudo ln -s /etc/nginx/sites-available/promad /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx


# ───────────────────────────────────────────────────
# PASSO 11 — Configurar Firewall (UFW)
# ───────────────────────────────────────────────────
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Verificar regras
sudo ufw status


# ───────────────────────────────────────────────────
# PASSO 12 — SSL gratuito com Let's Encrypt (HTTPS)
# ───────────────────────────────────────────────────
# Pule este passo se não tiver domínio configurado

sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com
# Siga as instruções, informe seu e-mail

# Renovação automática (já configurada pelo certbot, mas para verificar):
sudo certbot renew --dry-run


# ───────────────────────────────────────────────────
# VERIFICAÇÃO FINAL
# ───────────────────────────────────────────────────

# 1. Checar se a aplicação está rodando
pm2 status

# 2. Testar a API diretamente
curl http://localhost:3000/api/health
# Deve retornar: {"status":"ok","db":"conectado"}

# 3. Checar Nginx
sudo systemctl status nginx

# 4. Ver logs em tempo real
pm2 logs promad


# ───────────────────────────────────────────────────
# COMANDOS ÚTEIS DO DIA A DIA
# ───────────────────────────────────────────────────

# Reiniciar aplicação após atualizar arquivos:
pm2 restart promad

# Ver logs:
pm2 logs promad
pm2 logs promad --lines 100

# Parar / iniciar:
pm2 stop promad
pm2 start promad

# Monitorar uso de CPU e memória:
pm2 monit

# Atualizar o projeto (se usar Git):
cd /home/promad/promad
git pull
npm install --production
pm2 restart promad

# Backup do banco de dados:
pg_dump -U promad_user -d promad -h localhost -W > backup_$(date +%Y%m%d).sql

# Restaurar backup:
psql -U promad_user -d promad -h localhost -W < backup_20240101.sql

# Ver logs do Nginx:
sudo tail -f /var/log/nginx/promad_access.log
sudo tail -f /var/log/nginx/promad_error.log
