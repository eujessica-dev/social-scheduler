# Como rodar localmente

## Pré-requisitos

- [Node.js 20+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io/installation) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## 1. Clone e instale

```bash
git clone https://github.com/eujessica-dev/social-scheduler.git
cd social-scheduler
pnpm install
```

---

## 2. Suba os serviços de infraestrutura

```bash
docker-compose up -d
```

Isso sobe:
- **PostgreSQL** na porta `5432`
- **Redis** na porta `6379`
- **MailHog** (e-mail de dev) em `http://localhost:8025`

---

## 3. Configure as variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edite `apps/api/.env` com os valores reais. Para rodar localmente, só os campos obrigatórios:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_scheduler
REDIS_URL=redis://:redis_password@localhost:6379
JWT_SECRET=qualquer-string-longa-aqui
ENCRYPTION_KEY=gere-com-o-comando-abaixo
```

Para gerar a `ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Rode as migrations e o seed

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Isso cria todas as tabelas e um usuário admin de teste:
- **E-mail:** `admin@socialscheduler.dev`
- **Senha:** definida no seed (alterar em `packages/database/prisma/seed.ts`)

---

## 5. Inicie o desenvolvimento

```bash
pnpm dev
```

Isso sobe em paralelo (via Turborepo):
- **API** → `http://localhost:3001/api/v1`
- **Web** → `http://localhost:3000`

---

## Comandos úteis

| Comando | O que faz |
|---------|-----------|
| `pnpm dev` | Inicia API e Web em modo watch |
| `pnpm build` | Build de produção de todos os apps |
| `pnpm db:studio` | Abre o Prisma Studio (interface visual do banco) |
| `pnpm db:migrate` | Aplica migrations pendentes |
| `pnpm db:seed` | Popula o banco com dados de desenvolvimento |
| `docker-compose down` | Para os containers |
| `docker-compose down -v` | Para e remove os volumes (apaga dados) |

---

## Variáveis opcionais (para testar integrações)

### Meta (Instagram + Facebook)
```env
META_APP_ID=seu-app-id
META_APP_SECRET=seu-app-secret
META_REDIRECT_URI=http://localhost:3001/api/v1/social-accounts/meta/callback
```

### Storage (Cloudflare R2 ou AWS S3)
```env
STORAGE_ENDPOINT=https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=sua-access-key
STORAGE_SECRET_ACCESS_KEY=seu-secret
STORAGE_BUCKET=social-scheduler-media
STORAGE_PUBLIC_URL=https://media.seudominio.com
```
