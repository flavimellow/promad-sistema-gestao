# PROMAD · Sistema de Gestão

Sistema completo de gestão de aprendizes com Node.js + PostgreSQL.

---

## 📁 Estrutura

```
promad/
├── backend/
│   ├── db/
│   │   ├── schema.sql      ← cria as tabelas no PostgreSQL
│   │   └── pool.js         ← conexão com o banco
│   ├── routes/
│   │   ├── aprendizes.js
│   │   ├── empresas.js
│   │   ├── contratos.js
│   │   ├── uniformes.js
│   │   ├── ferias.js
│   │   └── licencas.js
│   └── server.js           ← servidor Express
├── frontend/
│   ├── index.html
│   ├── css/PROMAD_Admin.css
│   └── js/PROMAD_Admin.js
├── .env.example
├── .gitignore
└── package.json
```

---

## 🚀 Instalação local

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com sua DATABASE_URL
```

### 3. Criar as tabelas no PostgreSQL
```bash
# Com psql instalado:
psql $DATABASE_URL -f backend/db/schema.sql

# Ou via npm script:
npm run db:init
```

### 4. Iniciar o servidor
```bash
# Produção:
npm start

# Desenvolvimento (com auto-reload):
npm run dev
```

Acesse: **http://localhost:3000**

---

## ☁️ Deploy no Railway

1. Crie conta em [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Adicione um serviço **PostgreSQL** ao projeto
4. O Railway preenche `DATABASE_URL` automaticamente
5. Em **Variables**, adicione: `NODE_ENV=production`
6. O deploy é automático a cada `git push`

---

## ☁️ Deploy no Render

1. Crie conta em [render.com](https://render.com)
2. **New → Web Service → Connect GitHub**
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Adicione **New → PostgreSQL** e copie a **Internal Database URL**
6. Em **Environment Variables** do Web Service, adicione:
   - `DATABASE_URL` = URL copiada acima
   - `NODE_ENV` = `production`

---

## 🔌 Endpoints da API

| Método | Rota                    | Descrição              |
|--------|-------------------------|------------------------|
| GET    | /api/aprendizes         | Listar aprendizes      |
| POST   | /api/aprendizes         | Criar aprendiz         |
| PUT    | /api/aprendizes/:id     | Atualizar aprendiz     |
| DELETE | /api/aprendizes/:id     | Excluir aprendiz       |
| GET    | /api/empresas           | Listar empresas        |
| POST   | /api/empresas           | Criar empresa          |
| PUT    | /api/empresas/:id       | Atualizar empresa      |
| DELETE | /api/empresas/:id       | Excluir empresa        |
| GET    | /api/contratos          | Listar contratos       |
| POST   | /api/contratos          | Criar contrato         |
| PUT    | /api/contratos/:id      | Atualizar contrato     |
| DELETE | /api/contratos/:id      | Excluir contrato       |
| GET    | /api/uniformes          | Listar uniformes       |
| POST   | /api/uniformes          | Registrar uniforme     |
| DELETE | /api/uniformes/:id      | Excluir uniforme       |
| GET    | /api/ferias             | Listar férias          |
| POST   | /api/ferias             | Registrar férias       |
| DELETE | /api/ferias/:id         | Excluir férias         |
| GET    | /api/licencas           | Listar licenças        |
| POST   | /api/licencas           | Registrar licença      |
| DELETE | /api/licencas/:id       | Excluir licença        |
| GET    | /api/dashboard          | KPIs do dashboard      |
| GET    | /api/health             | Status da conexão DB   |
