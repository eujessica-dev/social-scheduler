# Modelo de Banco de Dados

## Diagrama de entidades principais

```
users ──────────────── organization_members ──── organizations
                                                      │
                              ┌───────────────────────┼──────────────────────┐
                              │                       │                      │
                           brands              social_accounts          subscriptions
                              │                       │
                           posts              oauth_tokens
                              │
                    ┌─────────┴──────────┐
                    │                    │
             post_platforms         media_assets
                    │
           publishing_logs
                    │
          metrics_snapshots
```

## Tabelas

### users
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | varchar(255) | Nome completo |
| email | varchar(255) | E-mail único |
| password_hash | text | Argon2id |
| email_verified_at | timestamp | Verificação de e-mail |
| two_factor_enabled | boolean | 2FA ativo |
| two_factor_secret | text | Secret TOTP criptografado |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### organizations
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | varchar(255) | Nome da organização |
| slug | varchar(100) | Slug único para URLs |
| plan | enum | free, starter, pro, agency |
| trial_ends_at | timestamp | Fim do período trial |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### organization_members
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| user_id | uuid | FK → users |
| role | enum | owner, admin, editor, client, finance, readonly |
| invited_by | uuid | FK → users |
| accepted_at | timestamp | Aceite do convite |
| created_at | timestamp | — |

### brands
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| name | varchar(255) | Nome da marca/cliente |
| avatar_url | text | Logo |
| color | varchar(7) | Cor primária (#hex) |
| created_by | uuid | FK → users |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### social_accounts
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| brand_id | uuid | FK → brands (opcional) |
| platform | enum | instagram, facebook, tiktok |
| platform_user_id | varchar(255) | ID na plataforma |
| account_name | varchar(255) | Nome da conta |
| account_avatar | text | URL do avatar |
| status | enum | active, disconnected, expired, error |
| connected_at | timestamp | — |
| disconnected_at | timestamp | — |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### oauth_tokens
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| social_account_id | uuid | FK → social_accounts |
| access_token_encrypted | text | AES-256-GCM |
| refresh_token_encrypted | text | AES-256-GCM (quando disponível) |
| expires_at | timestamp | Expiração do access token |
| scopes | text[] | Escopos autorizados |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### media_assets
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| brand_id | uuid | FK → brands (opcional) |
| uploaded_by | uuid | FK → users |
| filename | varchar(255) | Nome original |
| storage_key | text | Chave no S3/R2 |
| mime_type | varchar(100) | MIME type validado |
| size_bytes | bigint | Tamanho em bytes |
| width | integer | Largura (imagens/vídeos) |
| height | integer | Altura (imagens/vídeos) |
| duration_seconds | integer | Duração (vídeos) |
| status | enum | uploading, ready, error, deleted |
| created_at | timestamp | — |

### posts
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| brand_id | uuid | FK → brands |
| title | varchar(255) | Título interno |
| caption | text | Legenda/texto do post |
| hashtags | text[] | Hashtags separadas |
| status | enum | draft, pending_approval, approved, scheduled, publishing, published, failed, cancelled |
| scheduled_at | timestamp | Data/hora de publicação |
| timezone | varchar(100) | Ex: America/Sao_Paulo |
| created_by | uuid | FK → users |
| approved_by | uuid | FK → users (nullable) |
| approved_at | timestamp | — |
| notes | text | Observações internas |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### post_platforms
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| post_id | uuid | FK → posts |
| social_account_id | uuid | FK → social_accounts |
| platform | enum | instagram, facebook, tiktok |
| platform_post_id | varchar(255) | ID retornado pela plataforma |
| status | enum | pending, publishing, published, failed |
| error_message | text | Mensagem de erro (quando failed) |
| error_code | varchar(100) | Código de erro da API |
| published_at | timestamp | — |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### scheduled_jobs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| post_id | uuid | FK → posts |
| queue_job_id | varchar(255) | ID do job no BullMQ |
| status | enum | queued, processing, completed, failed, cancelled |
| attempts | integer | Número de tentativas |
| last_attempt_at | timestamp | — |
| created_at | timestamp | — |

### publishing_logs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| post_platform_id | uuid | FK → post_platforms |
| attempt_number | integer | Número da tentativa |
| request_payload | jsonb | Payload enviado para a API |
| response_payload | jsonb | Resposta recebida |
| http_status | integer | Status HTTP da resposta |
| duration_ms | integer | Tempo de resposta |
| success | boolean | — |
| created_at | timestamp | — |

### metrics_snapshots
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| post_platform_id | uuid | FK → post_platforms |
| social_account_id | uuid | FK → social_accounts |
| collected_at | timestamp | Momento da coleta |
| reach | integer | Alcance |
| impressions | integer | Impressões |
| likes | integer | Curtidas |
| comments | integer | Comentários |
| shares | integer | Compartilhamentos |
| saves | integer | Salvamentos |
| views | integer | Visualizações (vídeos) |
| clicks | integer | Cliques no link |
| engagement_rate | decimal(5,4) | Taxa de engajamento |
| raw_data | jsonb | Payload bruto da API |

### subscriptions
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| plan | enum | starter, pro, agency |
| status | enum | active, past_due, cancelled, trialing |
| gateway | enum | stripe, asaas, mercadopago |
| gateway_subscription_id | varchar(255) | ID no gateway |
| current_period_start | timestamp | — |
| current_period_end | timestamp | — |
| cancelled_at | timestamp | — |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### audit_logs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| user_id | uuid | FK → users (nullable para ações de sistema) |
| action | varchar(100) | Ex: post.created, account.connected |
| entity_type | varchar(100) | Ex: post, social_account |
| entity_id | uuid | ID da entidade afetada |
| ip_address | inet | IP da requisição |
| user_agent | text | User-Agent |
| metadata | jsonb | Dados adicionais relevantes |
| created_at | timestamp | — |

### white_label_settings
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations (unique) |
| custom_domain | varchar(255) | Domínio customizado |
| logo_url | text | URL do logo |
| favicon_url | text | URL do favicon |
| primary_color | varchar(7) | Cor primária (#hex) |
| secondary_color | varchar(7) | Cor secundária (#hex) |
| email_sender_name | varchar(255) | Nome do remetente nos e-mails |
| email_sender_domain | varchar(255) | Domínio de envio de e-mails |
| hide_branding | boolean | Remover marca da plataforma |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### refresh_tokens
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| token_hash | varchar(255) | Hash do token (não o token em si) |
| device_info | text | Info do dispositivo |
| ip_address | inet | IP de criação |
| expires_at | timestamp | — |
| revoked_at | timestamp | Revogação manual |
| created_at | timestamp | — |

### api_keys
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| organization_id | uuid | FK → organizations |
| name | varchar(255) | Nome/descrição da chave |
| key_hash | varchar(255) | Hash da chave |
| last_used_at | timestamp | — |
| expires_at | timestamp | — |
| revoked_at | timestamp | — |
| created_by | uuid | FK → users |
| created_at | timestamp | — |
