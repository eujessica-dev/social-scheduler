# Roadmap

## Fase 1 — MVP (meses 1–3)

Objetivo: produto funcional com Instagram e Facebook, pronto para primeiros clientes pagantes.

### Fundação
- [x] Monorepo configurado (pnpm workspaces)
- [x] Schema Prisma completo
- [x] Docker Compose para desenvolvimento local
- [ ] CI/CD básico (GitHub Actions)

### Backend
- [ ] Módulo Auth (registro, login, refresh token, logout, verificação de e-mail)
- [ ] Módulo Organizations (CRUD, convite de membros, RBAC)
- [ ] Módulo Brands (CRUD de marcas/clientes)
- [ ] Módulo Social Accounts (OAuth Meta, listagem de páginas/contas)
- [ ] Módulo Media Library (upload, validação, storage S3/R2)
- [ ] Módulo Posts (CRUD, status, aprovação)
- [ ] Módulo Scheduler (agendamento, fila BullMQ)
- [ ] Worker de publicação (Meta Graph API)
- [ ] Módulo Metrics (coleta de dados da Meta, dashboard)
- [ ] Módulo Billing (Stripe ou Asaas, planos, webhook de pagamento)
- [ ] Módulo Audit Logs

### Frontend
- [ ] Layout base (sidebar, header, notificações)
- [ ] Tela de autenticação (login, registro, recuperação)
- [ ] Tela de dashboard
- [ ] Tela de calendário de posts
- [ ] Compositor de posts
- [ ] Biblioteca de mídia
- [ ] Tela de contas sociais
- [ ] Tela de métricas por conta
- [ ] Tela de métricas por post
- [ ] Tela de configurações da organização
- [ ] Tela de membros e permissões
- [ ] Tela de plano e assinatura

## Fase 2 — Crescimento (meses 4–6)

- [ ] TikTok Content Posting API
- [ ] Fluxo de aprovação de posts pelo cliente
- [ ] Relatórios exportáveis (PDF e CSV)
- [ ] IA para sugestão de legendas (OpenAI/Gemini)
- [ ] Calendário visual com drag-and-drop
- [ ] Biblioteca de hashtags por nicho
- [ ] Templates de posts reutilizáveis
- [ ] Notificações push e por e-mail
- [ ] Comparativo de métricas entre períodos

## Fase 3 — Escala (meses 7–12)

- [ ] White label completo (domínio próprio, SSL automático, branding)
- [ ] App mobile (React Native / Expo)
- [ ] API pública com autenticação por chave
- [ ] Inbox (comentários e DMs centralizados)
- [ ] Gestão de equipe avançada
- [ ] Multiagência (agência gerenciando sub-agências)
- [ ] Marketplace de templates
- [ ] Automações (tipo Zapier interno)
- [ ] Integrações: Google Drive, Dropbox, Canva

## Decisões técnicas pendentes

| Decisão | Opções | Prazo |
|---------|--------|-------|
| Gateway de pagamento principal | Stripe, Asaas, Mercado Pago | Antes da Fase 1 |
| Storage provider | Cloudflare R2, AWS S3 | Antes da Fase 1 |
| Serviço de e-mail transacional | Resend, SendGrid, Amazon SES | Antes da Fase 1 |
| Antivírus em uploads | ClamAV (self-hosted), VirusTotal API | Antes da Fase 1 |
| Monitoramento | Sentry (erros) + Grafana/Loki (logs) | Antes do deploy |
