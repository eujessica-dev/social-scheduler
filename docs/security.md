# Segurança e Privacidade

## Princípios

O Social Scheduler trata dados pessoais de usuários e tokens de acesso a redes sociais. Toda decisão de arquitetura prioriza **segurança por padrão** e conformidade com a **LGPD**.

## Autenticação

### Senhas
- Hash com **Argon2id** (memória: 64MB, iterações: 3, paralelismo: 4)
- Nunca armazenar senha em texto claro, log ou variável de sessão

### JWT
- Access token: validade de **15 minutos**, assinado com RS256
- Payload mínimo: `{ sub, organizationId, role, iat, exp }`
- Nunca incluir dados sensíveis no payload JWT

### Refresh Token
- Opaque token de 64 bytes gerados com `crypto.randomBytes`
- Armazenado como hash SHA-256 no banco
- Cookie: `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`
- Validade: 30 dias
- **Rotação**: cada uso invalida o token atual e gera um novo par
- **Família de tokens**: se um token revogado for reutilizado, toda a família é invalidada (proteção contra roubo)

### Bloqueio de conta
- Máximo de 5 tentativas de login com senha incorreta em 15 minutos
- Após limite: bloquear por 30 minutos (Redis TTL)
- Notificar usuário por e-mail em tentativas suspeitas

## Tokens OAuth de redes sociais

```
NUNCA salvar token em texto claro no banco.

Fluxo de criptografia:
1. token recebido da API
2. gerar iv aleatório (16 bytes)
3. criptografar com AES-256-GCM usando KEY do ambiente
4. salvar: base64(iv + ciphertext + authTag)

Fluxo de descriptografia (apenas no worker, no momento de usar):
1. ler do banco
2. decodificar base64
3. separar iv, ciphertext, authTag
4. descriptografar com AES-256-GCM
5. usar token
6. descartar da memória imediatamente após uso
```

A `ENCRYPTION_KEY` deve ser:
- 32 bytes (256 bits) gerada com `crypto.randomBytes(32)`
- Armazenada em variável de ambiente
- Em produção: gerenciada via AWS KMS ou Google Secret Manager
- **Nunca** commitada no repositório

## Autorização (RBAC)

- Todo endpoint do backend valida `organization_id` via guard de NestJS
- O `organization_id` vem do JWT, nunca do corpo da requisição
- Nunca confiar em parâmetros enviados pelo cliente para identificar a organização
- Validar `ownership` de cada recurso antes de qualquer operação

```typescript
// Padrão obrigatório em todos os services
const post = await this.prisma.post.findFirst({
  where: { id, organizationId: user.organizationId }, // sempre filtrar por org
});
if (!post) throw new NotFoundException();
```

## Uploads de arquivo

Pipeline obrigatória antes de salvar qualquer arquivo:

1. Validar extensão contra whitelist (`jpg, jpeg, png, gif, webp, mp4, mov`)
2. Validar MIME type real (ler magic bytes, não confiar na extensão)
3. Verificar tamanho máximo (imagem: 50MB, vídeo: 1GB)
4. Scan antivírus (ClamAV local ou VirusTotal API)
5. Remover metadados EXIF de imagens (Sharp.js)
6. Upload para storage privado (sem acesso público)
7. Gerar URL assinada com expiração de 1 hora para exibição

## Headers de segurança

Configurar via middleware NestJS e next.config.js:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [política configurada por ambiente]
```

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| POST /auth/login | 5 req/15min por IP |
| POST /auth/register | 3 req/hora por IP |
| POST /auth/forgot-password | 3 req/hora por IP |
| POST /media/* | 20 req/min por usuário |
| POST /posts/* | 60 req/min por organização |
| GET /* (geral) | 300 req/min por usuário |

Implementado com `nestjs-throttler` + Redis como store.

## CORS

```typescript
// Apenas origens explicitamente permitidas
app.enableCors({
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

## Logs de auditoria

Registrar obrigatoriamente:
- Login (sucesso e falha)
- Logout
- Registro de usuário
- Alteração de senha
- Ativação/desativação de 2FA
- Conexão de conta social
- Desconexão de conta social
- Criação de post
- Edição de post
- Exclusão de post
- Agendamento de post
- Publicação (sucesso e falha)
- Aprovação/rejeição de post
- Convite de membro
- Alteração de papel de membro
- Remoção de membro
- Alteração de plano/assinatura
- Exportação de dados
- Alteração de configurações de white label

**Nunca registrar:** senha, token puro, dados de cartão, dados sensíveis em texto claro.

## LGPD

- Usuário pode solicitar exportação de todos os seus dados (Art. 18)
- Usuário pode solicitar exclusão da conta e dados (Art. 18)
- Consentimento explícito para coleta de dados na criação da conta
- Dados de métricas de redes sociais não são dados pessoais do usuário final
- Retenção de logs de auditoria: 1 ano
- Retenção de dados de conta após exclusão: 30 dias (para disputas), depois exclusão definitiva

## Resposta a incidentes

1. Detectar via alertas (Sentry + Datadog)
2. Isolar sistema afetado (desabilitar endpoints específicos via feature flag)
3. Revogar todos os tokens da sessão suspeita
4. Auditar logs a partir do momento do incidente
5. Identificar e corrigir a falha
6. Comunicar usuários afetados por e-mail em até 72h
7. Comunicar ANPD se houver risco relevante aos titulares
8. Gerar relatório pós-incidente documentando causa raiz e ações tomadas
