# Integrações com APIs de Redes Sociais

## Meta Graph API (Instagram + Facebook)

### Pré-requisitos

1. Criar app no [Meta for Developers](https://developers.facebook.com)
2. Adicionar produtos: **Instagram Graph API** e **Facebook Login**
3. Solicitar permissões via App Review (produção)
4. Configurar webhook para receber atualizações de token

### Permissões necessárias

**Instagram:**
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`

**Facebook Pages:**
- `pages_manage_posts`
- `pages_read_engagement`
- `pages_show_list`

### Fluxo OAuth

```
1. Frontend redireciona para:
   https://www.facebook.com/v19.0/dialog/oauth
   ?client_id={APP_ID}
   &redirect_uri={CALLBACK_URL}
   &scope={SCOPES}
   &state={CSRF_TOKEN}

2. Meta retorna code na callback URL

3. Backend troca code por access_token:
   GET https://graph.facebook.com/v19.0/oauth/access_token
   ?client_id={APP_ID}
   &client_secret={APP_SECRET}
   &code={CODE}
   &redirect_uri={CALLBACK_URL}

4. Backend troca short-lived token por long-lived token (60 dias):
   GET https://graph.facebook.com/v19.0/oauth/access_token
   ?grant_type=fb_exchange_token
   &client_id={APP_ID}
   &client_secret={APP_SECRET}
   &fb_exchange_token={SHORT_LIVED_TOKEN}

5. Backend salva token criptografado no banco
6. Backend lista páginas e contas Instagram vinculadas
7. Usuário seleciona quais contas conectar
```

### Publicação no Instagram

```
Imagem única:
POST /v19.0/{ig-user-id}/media
  { image_url, caption }
→ retorna container_id

POST /v19.0/{ig-user-id}/media_publish
  { creation_id: container_id }
→ retorna post_id

Vídeo/Reel:
POST /v19.0/{ig-user-id}/media
  { media_type: REELS, video_url, caption }
→ verificar status com GET /{container-id}?fields=status_code até FINISHED
→ publicar com media_publish

Carrossel:
POST /v19.0/{ig-user-id}/media para cada item (image_url apenas)
POST /v19.0/{ig-user-id}/media
  { media_type: CAROUSEL, children: [id1, id2, ...], caption }
POST /v19.0/{ig-user-id}/media_publish
```

### Publicação no Facebook Pages

```
POST /v19.0/{page-id}/feed
  { message, link (opcional) }
  Authorization: Bearer {PAGE_ACCESS_TOKEN}

POST /v19.0/{page-id}/photos
  { url, caption }

POST /v19.0/{page-id}/videos
  { file_url, description, title }
```

### Limites importantes

| Recurso | Limite |
|---------|--------|
| Posts via API (Instagram) | 100 publicações em 24h por conta |
| Insights delay | Dados disponíveis ~24h após publicação |
| Rate limit (Graph API) | 200 calls/hora por token de usuário |
| Vídeo Instagram (Reel) | Máx. 90 segundos, mín. 3 segundos |
| Imagem Instagram | Máx. 8MB, formatos: JPEG, PNG |

---

## TikTok Content Posting API

### Status: Fase 2

O TikTok exige processo de review próprio e UX obrigatória. Implementar após MVP Meta estar estável.

### Pré-requisitos

1. Registrar no [TikTok for Developers](https://developers.tiktok.com)
2. Criar app e solicitar produto **Content Posting API**
3. Implementar UX exigida pelo TikTok (botões de login, termos)
4. Passar por review antes de produção

### Permissões necessárias

- `video.upload`
- `video.publish`
- `user.info.basic`

### Modos de publicação

**Modo direto (direct_post):** vídeo publicado imediatamente na conta
**Modo rascunho (upload_from_file):** enviado como draft, usuário finaliza no app

### Limites importantes

- 6 requests/minuto por usuário nos endpoints de postagem
- Vídeos: 4MB a 4GB, formatos: MP4, MOV, MPEG, AVI
- Duração: 3 segundos a 10 minutos

---

## Estratégia de renovação de tokens

Os tokens da Meta expiram em 60 dias. O sistema deve:

1. Verificar `expires_at` de todos os tokens ativos diariamente (cron job)
2. Tokens com menos de 10 dias para expirar: renovar automaticamente
3. Tokens expirados: marcar conta como `expired` e notificar usuário
4. Manter histórico de tokens para auditoria

```
Cron: todos os dias às 03:00 UTC
→ buscar tokens expirando em < 10 dias
→ chamar endpoint de refresh da plataforma
→ salvar novo token criptografado
→ atualizar expires_at
→ registrar em audit_log
```
