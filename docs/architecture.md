# Arquitetura do Sistema

## Visão geral

O Social Scheduler é um monorepo organizado com `pnpm workspaces`, separando responsabilidades em apps e packages independentes que compartilham tipos e utilitários via `packages/shared`.

```
                          ┌─────────────────────┐
                          │    Cloudflare WAF    │
                          └─────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
     ┌────────▼────────┐  ┌─────────▼────────┐  ┌───────▼────────┐
     │  apps/web       │  │   apps/api       │  │  BullMQ Worker │
     │  (Next.js)      │  │   (NestJS)       │  │  (publicação)  │
     │  Vercel         │  │   Railway        │  │                │
     └────────┬────────┘  └─────────┬────────┘  └───────┬────────┘
              │                     │                     │
              │           ┌─────────▼────────┐            │
              │           │  PostgreSQL       │            │
              │           │  (Neon/RDS)      │            │
              │           └──────────────────┘            │
              │                     │                     │
              │           ┌─────────▼────────┐            │
              └───────────│  Redis (Upstash) │────────────┘
                          │  filas + cache   │
                          └──────────────────┘
                                    │
                          ┌─────────▼────────┐
                          │  Cloudflare R2   │
                          │  (mídia/storage) │
                          └──────────────────┘
```

## Fluxo de publicação

```
Usuário agenda post
       │
       ▼
Backend salva post (status: scheduled)
       │
       ▼
Job criado na fila BullMQ com delay até o horário
       │
       ▼
Worker acorda no horário definido
       │
       ▼
Worker busca token OAuth da conta social
       │
       ▼
Worker chama API da plataforma (Meta Graph API / TikTok)
       │
  ┌────┴─────┐
  │          │
sucesso    falha
  │          │
  ▼          ▼
salva      retry automático (3x, backoff exponencial)
resultado  após 3 falhas → dead-letter queue
  │          │
  ▼          ▼
notifica   notifica usuário (falha)
usuário    registra erro em audit_log
```

## Multi-tenancy

Todo recurso da aplicação pertence a uma organização. O `organization_id` é validado em **todos** os endpoints do backend. Nenhum dado de uma organização é acessível por outra, independente do papel do usuário.

```
User
 └── OrganizationMember (papel: owner | admin | editor | client | finance | readonly)
      └── Organization
           ├── Brand[]
           ├── SocialAccount[]
           ├── MediaAsset[]
           ├── Post[]
           └── Subscription
```

## Autenticação

- **Access Token**: JWT, validade de 15 minutos, assinado com RS256
- **Refresh Token**: opaque token, validade de 30 dias, armazenado em cookie `HttpOnly / Secure / SameSite=Strict`
- **Rotação**: a cada uso do refresh token, um novo par é emitido e o anterior é invalidado
- **Revogação**: refresh tokens são armazenados no banco com hash; logout invalida o token imediatamente
- **2FA**: TOTP via aplicativo autenticador (Fase 2)

## RBAC

| Papel | Publicar | Editar posts | Aprovar | Ver métricas | Gerenciar membros | Billing |
|-------|----------|-------------|---------|-------------|------------------|---------|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Editor | ✓ | ✓ | — | ✓ | — | — |
| Client | — | — | ✓ | ✓ | — | — |
| Finance | — | — | — | ✓ | — | ✓ |
| Readonly | — | — | — | ✓ | — | — |

## Segurança de arquivos

Todo arquivo enviado passa pela seguinte pipeline antes de ser salvo:

1. Validação de extensão permitida
2. Validação de MIME type real (não apenas extensão)
3. Verificação de tamanho máximo (imagem: 50MB, vídeo: 1GB)
4. Scan antivírus (ClamAV ou VirusTotal API)
5. Remoção de metadados EXIF em imagens
6. Upload para storage privado (R2/S3)
7. Geração de URL assinada com expiração para exibição

## Criptografia de tokens OAuth

Os access tokens e refresh tokens das redes sociais são criptografados com AES-256-GCM antes de salvar no banco. A chave de criptografia é armazenada em variável de ambiente (nunca no código ou no banco). Em produção, usar AWS KMS ou Google Secret Manager para gerenciamento da chave.

```
token_original → AES-256-GCM(token, KEY) → iv + ciphertext + authTag → base64 → banco
```
