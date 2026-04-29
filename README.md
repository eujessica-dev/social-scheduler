# Social Scheduler

Plataforma SaaS de agendamento de posts e métricas para redes sociais. Conecte Instagram, Facebook e TikTok, agende publicações, acompanhe métricas e gerencie múltiplos clientes em um só lugar.

## Visão geral

O Social Scheduler nasceu da necessidade de centralizar a gestão de redes sociais para agências e criadores de conteúdo. A plataforma permite conectar contas profissionais via OAuth oficial, criar e agendar posts com upload de mídia, publicar automaticamente nos horários definidos e acompanhar o desempenho de cada publicação.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | NestJS, TypeScript, Prisma ORM |
| Banco de dados | PostgreSQL |
| Filas | Redis + BullMQ |
| Storage | Cloudflare R2 / AWS S3 |
| Autenticação | JWT + Refresh Token rotativo, cookies HttpOnly |
| Infraestrutura MVP | Vercel (frontend), Railway (backend), Neon (DB), Upstash (Redis) |

## Estrutura do monorepo

```
social-scheduler/
├── apps/
│   ├── web/          # Frontend Next.js
│   └── api/          # Backend NestJS
├── packages/
│   ├── shared/       # Types, interfaces e utilitários compartilhados
│   └── database/     # Schema Prisma e migrations
├── docs/             # Documentação técnica detalhada
└── docker-compose.yml
```

## Módulos

- **Auth** — cadastro, login, 2FA, refresh token, recuperação de senha
- **Organizations** — workspaces multi-tenant isolados por `organization_id`
- **Members / RBAC** — papéis: Owner, Admin, Editor, Cliente, Financeiro, Leitura
- **Brands** — marcas/clientes dentro de cada organização
- **Social Accounts** — conexão OAuth com Instagram, Facebook e TikTok
- **Media Library** — upload, validação, compressão e organização de criativos
- **Posts** — compositor com legenda, hashtags, criativo, rede e status de aprovação
- **Scheduler** — agendamento por data, hora e timezone
- **Publishing Workers** — fila BullMQ com retry, dead-letter queue e logs
- **Metrics** — coleta e exibição de alcance, engajamento e impressões por plataforma
- **Billing** — assinatura por plano com abstração para Stripe, Asaas e Mercado Pago
- **Audit Logs** — registro imutável de todas as ações relevantes
- **Webhooks** — eventos de publicação, falha, aprovação e billing
- **White Label** — domínio, logo e cores customizadas por organização

## Roadmap

### Fase 1 — MVP
- [x] Estrutura do monorepo e documentação
- [ ] Schema Prisma completo
- [ ] Autenticação (cadastro, login, refresh token)
- [ ] Organizações e RBAC
- [ ] Marcas/clientes
- [ ] Biblioteca de mídia
- [ ] Compositor de posts
- [ ] Agendamento + fila BullMQ
- [ ] Worker de publicação (Meta Graph API)
- [ ] Dashboard de métricas básicas
- [ ] Plano pago (Stripe/Asaas)

### Fase 2
- [ ] TikTok Content Posting API
- [ ] Aprovação de posts pelo cliente
- [ ] Relatórios exportáveis (PDF/CSV)
- [ ] IA para geração de legendas
- [ ] Calendário visual
- [ ] Biblioteca de hashtags e templates

### Fase 3
- [ ] White label completo com domínio próprio
- [ ] App mobile (React Native / Expo)
- [ ] API pública com autenticação por chave
- [ ] Inbox e gestão de comentários
- [ ] Multiagência e permissões avançadas

## Segurança

- HTTPS obrigatório em todo o sistema
- Tokens OAuth criptografados no banco (AES-256)
- Senhas com Argon2id
- RBAC com validação de `organization_id` em todos os endpoints
- Rate limit por IP, usuário e organização
- Logs de auditoria completos
- Conformidade com LGPD
- Validação de MIME type e antivírus em uploads
- Secrets gerenciados via variáveis de ambiente (nunca no código)

## Como rodar localmente

```bash
# Pré-requisitos: Node.js 20+, Docker, pnpm

# 1. Clone o repositório
git clone https://github.com/eujessica-dev/social-scheduler.git
cd social-scheduler

# 2. Suba os serviços de infraestrutura
docker-compose up -d

# 3. Instale as dependências
pnpm install

# 4. Configure as variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 5. Rode as migrations do banco
pnpm --filter @social-scheduler/database migrate

# 6. Inicie o desenvolvimento
pnpm dev
```

## Variáveis de ambiente

Veja os arquivos `.env.example` em cada app para a lista completa de variáveis necessárias.

## Licença

Proprietário. Todos os direitos reservados.
