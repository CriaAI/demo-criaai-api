# Guia de Integração CriaAI

> Documentação de implementação para parceiros externos (integradores).
> Validado em **2026-06-15** contra o ambiente de **dev** (`api-whitelabel-dev.criaai.com`)
> via chamadas reais à API, a collection do Postman e o código do front de produção.
>
> Implementação de referência: este próprio repositório (`demo-criaai-api`),
> em especial [`app/page.tsx`](app/page.tsx) e [`app/callback/page.tsx`](app/callback/page.tsx).

---

## 1. Visão geral

A CriaAI permite que um parceiro externo crie um documento jurídico e envie o usuário
para a plataforma da CriaAI **já autenticado**, sem o parceiro implementar tela de login.
Ao finalizar o documento, o usuário é redirecionado de volta para o parceiro (callback)
com a URL do documento gerado.

O modelo de sessão é **baseado em cookie de domínio `.criaai.com`**: a chamada de
criação de documento responde com `Set-Cookie`, e o front da CriaAI lê esse cookie.

### Fluxo em alto nível

```
Integrador (browser)                CriaAI API                 Front CriaAI
      │                                  │                          │
      │  1. POST /auth/login ───────────►│                          │
      │  ◄──────── { authorization } ────│                          │
      │                                  │                          │
      │  2. POST /documents/create-document (Authorization + credentials:'include')
      │  ─────────────────────────────► │                          │
      │  ◄── { documentId } + Set-Cookie (authToken; Domain=.criaai.com)
      │                                  │                          │
      │  3. redirect ──────────────────────────────────────────────►│  /documentInput
      │                                  │       (cookie é enviado)  │  usuário logado
      │                                  │                          │  edita o documento
      │                                  │                          │
      │  ◄───────── 4. callback ?success=True&document_url=… ───────│  ao "Finalizar"
```

> ⚠️ **Pré-requisito crítico (cookies de terceiros):** o cookie de sessão é setado
> para `.criaai.com` enquanto o usuário está no **domínio do integrador**. Isso é um
> *third-party cookie*. Navegadores que bloqueiam cookies de terceiros (cada vez mais
> o padrão) podem impedir o armazenamento — ver [Seção 8](#8-cors-e-cookies-mecânica-e-limitações).

---

## 2. Credenciais e pré-requisitos

Para integrar, o parceiro precisa obter da CriaAI:

| Item | Descrição | Onde é usado |
| --- | --- | --- |
| **`x-api-key`** | Chave de API do parceiro | Header de **todas** as chamadas |
| **e-mail + senha do parceiro** | Credenciais da conta de parceiro | Body do `POST /auth/login` |
| **plano externo habilitado** | A conta precisa ter `planId` de parceiro (`EXTERNAL_PLAN_ID`) para o front redirecionar ao fluxo externo | Configurado pela CriaAI |

E o parceiro precisa **fornecer**:

| Item | Descrição |
| --- | --- |
| **`linkCallback`** | URL HTTPS do parceiro para onde o usuário volta ao finalizar o documento |
| **`partnerUserId`** | Identificador do usuário final no sistema do parceiro |

> 🔒 As credenciais acima são **secretas**. Não versione os valores reais.
> Use variáveis de ambiente (ver [Seção 9](#9-variáveis-de-ambiente)).

---

## 3. Ambientes

| Ambiente | API base URL | Front URL |
| --- | --- | --- |
| **Dev** | `https://api-whitelabel-dev.criaai.com` | `https://dev-test.criaai.com` |
| **Produção** | *(confirmar com a CriaAI)* | *(confirmar com a CriaAI)* |

> ⚠️ **Não há prefixo de stage no path.** As rotas são `/auth/login` e
> `/documents/create-document` — **não** `/nonprod/auth/login`. Um path inexistente
> faz o API Gateway responder `403 { "message": "Missing Authentication Token" }`.

---

## 4. Referência de endpoints

### 4.1 `POST /auth/login` — autenticar o parceiro

Autentica a conta do parceiro e retorna um **JWT** (`authorization`) usado na criação do documento.

**Headers**
```
Content-Type: application/json
x-api-key: <SUA_API_KEY>
```

**Body**
```json
{
  "email": "parceiro@exemplo.com",
  "password": "********",
  "signinMethod": "email"
}
```

**Resposta `200`**
```json
{
  "message": "Login successfully!",
  "authorization": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "AMf-vByl0HHpPzB2...",
  "expiresIn": "3600"
}
```

- `authorization` — JWT (Firebase ID token). **Validade: 3600s (1h).**
- `refreshToken` — usado para renovar a sessão.
- ⚠️ Este endpoint **não** retorna `Set-Cookie`. A sessão em cookie só é criada no passo de criação do documento.

**Exemplo curl**
```bash
curl -X POST https://api-whitelabel-dev.criaai.com/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"email":"parceiro@exemplo.com","password":"********","signinMethod":"email"}'
```

---

### 4.2 `POST /documents/create-document` — criar o documento e a sessão

Cria um documento externo, devolve o `documentId` e **seta os cookies de sessão**
(`authToken`, `authRefreshToken`, `documentId`) no domínio `.criaai.com`.

**Headers**
```
Content-Type: application/json
x-api-key: <SUA_API_KEY>
Authorization: <authorization recebido no login>
```

**Opção de fetch (browser): `credentials: 'include'` é OBRIGATÓRIO** — sem ele o navegador
descarta o `Set-Cookie` e o usuário cai deslogado no front.

**Body**
```json
{
  "linkCallback": "https://parceiro.com/callback",
  "documentType": "rtf",
  "partnerUserId": "123"
}
```

- `linkCallback` *(obrigatório)* — URL HTTPS de retorno do parceiro.
- `documentType` — formato do documento (ex.: `"rtf"`, `"docx"`).
- `partnerUserId` — id do usuário final no sistema do parceiro.

**Resposta `201`**
```json
{
  "message": "Documento criado com sucesso",
  "documentId": "zzizpsWVM7MKzolaKqzyO5SQst4220260615180437426"
}
```

**Headers de resposta (sessão)**
```
access-control-allow-origin: https://parceiro.com      ← a origin é ecoada
access-control-allow-credentials: true
set-cookie: authToken=...;        Secure; SameSite=None; Path=/; Domain=.criaai.com
set-cookie: authRefreshToken=...; Secure; SameSite=None; Path=/; Domain=.criaai.com
set-cookie: documentId=...;       Secure; SameSite=None; Path=/; Domain=.criaai.com
```

> ⚠️ **Não existe `redirectUrl` na resposta.** O integrador monta o redirect ele mesmo
> (ver [Seção 5, passo 3](#5-sequência-de-implementação)).

---

### 4.3 `POST /documents/continue-document` — continuar um documento

Retoma um documento existente e **renova a sessão** (seta os mesmos cookies do create-document).
O `documentId` vai no **body** (não no path).

**Headers**
```
Content-Type: application/json
x-api-key: <SUA_API_KEY>
Authorization: <authorization do login>   (com ou sem prefixo "Bearer ")
Origin: https://dev-test.criaai.com
```

**Body**
```json
{ "documentId": "zzizpsWVM7MK...421" }
```

**Resposta `200`**
```json
{ "message": "Sucesso.", "documentId": "zzizpsWVM7MK...421" }
```

- Resposta inclui `Set-Cookie` de `authToken` / `authRefreshToken` / `documentId` (`Domain=.criaai.com`) — igual ao create-document. Use `credentials: 'include'` no fetch e redirecione para `/documentInput` em seguida.
- ⚠️ **Não** retorna `continueUrl`.

---

### 4.4 `GET /credits` — saldo de créditos

Retorna o saldo de créditos do usuário autenticado. Útil para checar antes de criar documentos.

**Headers**
```
x-api-key: <SUA_API_KEY>
Authorization: <authorization do login>   (obrigatório)
Origin: https://dev-test.criaai.com
```

**Resposta `200`**
```json
{ "userId": "zzizpsWVM7MK...", "credits": -102 }
```

- Sem `Authorization` → `401 { "error": "Token JWT é obrigatório." }`.

---

## 5. Sequência de implementação

### Passo 1 — Login

Chame `POST /auth/login`, guarde o `authorization` (JWT) **em memória** (não precisa persistir).

### Passo 2 — Criar o documento

Chame `POST /documents/create-document` **a partir do navegador**, com:
- header `Authorization: <jwt do passo 1>`
- header `x-api-key`
- `credentials: 'include'`
- body `{ linkCallback, documentType, partnerUserId }`

A resposta traz o `documentId`, e o navegador armazena os cookies de `.criaai.com`.

> 🧭 **Por que no browser?** O `Set-Cookie` tem `Domain=.criaai.com`. Para o cookie
> chegar ao **navegador do usuário** (e ser enviado quando ele acessar `dev-test.criaai.com`),
> a chamada precisa partir do **browser** com `credentials: 'include'`. Se for feita no
> backend do parceiro, o cookie fica no servidor e o usuário não loga.

### Passo 3 — Redirecionar para o front

```js
window.location.href = `${CRIAAI_FRONTEND_URL}/documentInput`;
```

Não é necessário passar token na URL — **a sessão vem pelo cookie**. O front lê
`documentId`/`authToken` dos cookies automaticamente.

### Passo 4 — Receber o callback

Quando o usuário clicar em "Finalizar" no front, a CriaAI redireciona o navegador para
o seu `linkCallback` com os parâmetros de resultado (ver [Seção 7](#7-callback)).

---

## 6. Implementação no front (tokens e cookies)

### 6.1 Login (sem credentials)

```js
const login = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify({ email, password, signinMethod: 'email' }),
});
const { authorization } = await login.json();
```

### 6.2 Create document (com credentials — passo que cria a sessão)

```js
const res = await fetch(`${API_BASE_URL}/documents/create-document`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'Authorization': authorization,          // JWT do login
  },
  credentials: 'include',                    // ⚠️ obrigatório p/ aceitar os cookies
  body: JSON.stringify({
    linkCallback: 'https://parceiro.com/callback',
    documentType: 'rtf',
    partnerUserId: '123',
  }),
});
const { documentId } = await res.json();
```

### 6.3 Redirect

```js
window.location.href = `${CRIAAI_FRONTEND_URL}/documentInput`;
```

### 6.4 Como o front da CriaAI lida com os tokens (contexto)

O integrador **não precisa gerenciar** os tokens da CriaAI — o front faz isso sozinho:

- Lê `authToken` / `authRefreshToken` / `documentId` dos **cookies** de `.criaai.com`.
- Renova o `authToken` automaticamente via refresh token quando ele expira (1h).
- Identifica o usuário externo (`planId` de parceiro) e o leva direto para `/documentInput`.

Ou seja: o trabalho do integrador termina no passo 3. O cookie carrega a sessão.

> ⚠️ **Os cookies não são `HttpOnly`** (o front os lê via JavaScript). Trate-os como
> sensíveis — qualquer script no domínio `.criaai.com` consegue lê-los.

---

## 7. Callback

Ao finalizar o documento, a CriaAI redireciona o navegador para o seu `linkCallback`
acrescentando os parâmetros via query string:

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `success` | string | `"True"` em caso de sucesso |
| `message` | string | Mensagem descritiva |
| `document_url` | string | URL do documento gerado (codificada) |

**Exemplo**
```
https://parceiro.com/callback?success=True&message=Documento%20criado%20com%20sucesso&document_url=https%3A%2F%2F...
```

**Tratamento no parceiro**
```js
const params = new URLSearchParams(window.location.search);
if (params.get('success') === 'True') {
  const documentUrl = params.get('document_url'); // já vem encoded; não faça decode manual
  // salvar / exibir / redirecionar internamente
}
```

> Use `success` como flag principal. Trate `document_url` como URL já codificada.

---

## 8. CORS e cookies (mecânica e limitações)

- A API responde ao preflight `OPTIONS` **ecoando a origin** do parceiro e
  `Access-Control-Allow-Credentials: true` — ou seja, funciona de qualquer domínio
  (localhost, Vercel, etc.), desde que use `credentials: 'include'`.
- Os cookies são `Secure; SameSite=None` → **só funcionam em HTTPS**.
  `http://localhost` **não** persiste o cookie de sessão; teste sempre em HTTPS.
- O cookie é de **terceiro** (setado para `.criaai.com` a partir do domínio do parceiro).
  **Navegadores com bloqueio de third-party cookies podem impedir o armazenamento.**
  Este é o principal ponto de falha residual e deve ser validado nos navegadores-alvo.

**Como diagnosticar:** após o create-document, abra DevTools → Application → Cookies →
`https://dev-test.criaai.com` e verifique se `authToken` foi gravado. Se não, cheque na
aba Rede se há aviso de cookie bloqueado na resposta.

---

## 9. Variáveis de ambiente

A implementação de referência (Next.js) usa:

```bash
# .env.local  (NÃO versionar)
NEXT_PUBLIC_API_BASE_URL=https://api-whitelabel-dev.criaai.com
NEXT_PUBLIC_AUTH_API_URL=https://api-whitelabel-dev.criaai.com
NEXT_PUBLIC_CRIAAI_FRONTEND_URL=https://dev-test.criaai.com
NEXT_PUBLIC_API_KEY=<sua_api_key>
NEXT_PUBLIC_PARTNER_EMAIL=<email_do_parceiro>
NEXT_PUBLIC_PARTNER_PASSWORD=<senha_do_parceiro>
```

> 🔒 **Atenção de segurança:** como o create-document precisa rodar no browser, a
> `x-api-key` fica exposta no cliente (prefixo `NEXT_PUBLIC_`). Avalie com a CriaAI o
> escopo/limites dessa key, já que ela é visível para o usuário final.

---

## 10. Erros comuns

| Sintoma | Causa | Solução |
| --- | --- | --- |
| `403 Missing Authentication Token` | Path com stage inexistente (`/nonprod/...`) | Use `/auth/login` e `/documents/create-document` sem prefixo |
| `401 / 403` no login (com corpo) | `x-api-key` inválida ou credenciais erradas | Confirmar credenciais com a CriaAI |
| `Failed to fetch` no browser | Preflight bloqueado (rota errada) ou origem sem HTTPS | Corrigir rota; servir o app em HTTPS |
| Usuário cai no `/login` do front | Cookie de sessão não foi armazenado | Garantir `credentials: 'include'`, HTTPS, e third-party cookies habilitados |
| Cookie não persiste em `localhost` | Cookie `Secure` exige HTTPS | Testar em ambiente HTTPS (ex.: deploy Vercel) |

---

## 11. Checklist de implementação

- [ ] Obtive `x-api-key`, e-mail/senha de parceiro e plano externo habilitado com a CriaAI
- [ ] App servido em **HTTPS**
- [ ] `POST /auth/login` → guardo o `authorization`
- [ ] `POST /documents/create-document` no **browser**, com `Authorization`, `x-api-key`, `credentials:'include'` e body `{ linkCallback, documentType, partnerUserId }`
- [ ] Verifiquei o `Set-Cookie`/`authToken` no domínio `.criaai.com` (DevTools)
- [ ] Redirect para `${CRIAAI_FRONTEND_URL}/documentInput`
- [ ] Página de callback lê `success` / `message` / `document_url`
- [ ] Validei o comportamento de third-party cookie nos navegadores-alvo
