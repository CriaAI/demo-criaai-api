# Integração Demo - Integração com CriaAI

Projeto de demonstração que simula o comportamento do site da Integração ao integrar com a CriaAI.

## Conceito Principal

A ideia deste projeto é **chamar uma API que automaticamente muda os cookies do endpoint e redireciona para esse endpoint**. Isso permite uma integração seamless onde:

1. O usuário permanece no site do parceiro (Integração)
2. Uma API call configura os cookies necessários no domínio da CriaAI
3. O usuário é redirecionado automaticamente para trabalhar no documento
4. Após finalizar, volta para o callback do parceiro

## Funcionalidades

- 🔐 Login automático na API da CriaAI
- 📄 Criação de documento externo via `createDocumentExternal`
- 🔄 **Continuação de documentos existentes**
- 📋 **Listagem e gerenciamento de documentos**
- 👁️ **Visualização de documentos concluídos**
- 💾 **Persistência local de documentos**
- 🍪 Configuração automática de cookies cross-domain
- 🔄 Redirecionamento transparente para CriaAI
- 📞 Recebimento de callback após finalização do documento
- 🧪 Scripts de teste para validação de cookies

## Como Rodar

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

## Testes

### Testes Automatizados

Execute os testes de configuração:

```bash
npm test
```

### Testes de Integração

Para testar o fluxo completo manualmente:

1. Abra o arquivo `test/integration.test.js` no navegador
2. Execute a função `runIntegrationTests()` no console
3. Ou execute diretamente no Node.js:

```bash
node test/integration.test.js
```

### Testes de Cookies

Para testar especificamente a configuração de cookies:

1. Abra `test_create_document.html` no navegador
2. Ou use o script `test_create_document.js` no console do DevTools

## Arquitetura

### Fluxo de Integração

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Integração │ -> │   CriaAI    │ -> │  Cookies    │
│   Frontend  │    │     API     │    │  Setados    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   1. Login           2. Create Doc       3. Redirect
   2. Create Doc      3. Return Data      4. Work on Doc
   3. Redirect        4. Set Cookies
   4. Work on Doc
```

### Componentes Principais

- **`lib/config.ts`**: Validação e centralização de configuração
- **`lib/documentStorage.ts`**: Gerenciamento de persistência local de documentos
- **`lib/continueDocument.ts`**: Lógica para continuar documentos existentes
- **`app/page.tsx`**: Interface principal e fluxo de integração
- **`app/documents/page.tsx`**: Listagem e gerenciamento de documentos
- **`app/callback/page.tsx`**: Página de retorno após finalizar documento
- **`test/`**: Arquivos de teste e validação

## Configuração

Crie um arquivo `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=https://api-whitelabel-dev.criaai.com
NEXT_PUBLIC_AUTH_API_URL=https://kqa418uhgj.execute-api.sa-east-1.amazonaws.com
NEXT_PUBLIC_STAGE=nonprod
NEXT_PUBLIC_API_KEY=sua-api-key
NEXT_PUBLIC_CRIAAI_FRONTEND_URL=https://dev-test.criaai.com

# Credenciais do parceiro para login automático
NEXT_PUBLIC_PARTNER_EMAIL=partner@example.com
NEXT_PUBLIC_PARTNER_PASSWORD=password123
```

### Explicação das URLs

- `NEXT_PUBLIC_API_BASE_URL`: API Gateway principal da CriaAI
- `NEXT_PUBLIC_AUTH_API_URL`: Endpoint específico de autenticação
- `NEXT_PUBLIC_CRIAAI_FRONTEND_URL`: URL do frontend da CriaAI onde o usuário trabalhará

## Fluxo Detalhado

### 1. Página Inicial
Usuário acessa a página inicial do site da Integração e clica em "Criar Documento na CriaAI"

### 2. Login Automático
```javascript
POST /auth/login
// Sistema faz login com credenciais do parceiro
// Recebe tokens de autenticação
```

### 3. Criação do Documento
```javascript
POST /documents/create-document
// Cria documento externo com linkCallback
// Recebe documentId e tokens específicos
```

### 4. Configuração de Cookies Cross-Domain
```javascript
// Redireciona para: https://dev-test.criaai.com/api/setExternalCookies?documentId=...&token=...
// Esta rota da CriaAI configura automaticamente os cookies necessários:
// - authToken
// - authRefreshToken
// - documentId
```

### 5. Trabalho no Documento
Usuário é redirecionado automaticamente para trabalhar no documento na plataforma CriaAI

### 6. Callback de Retorno
Após finalizar o documento, o usuário é redirecionado para `/callback` com parâmetros de sucesso/erro. O status do documento é automaticamente atualizado para `COMPLETED` no localStorage.

## Gerenciamento de Documentos

### Acessar Documentos

Navegue para `/documents` ou clique em "📋 Meus Documentos" na página inicial para ver todos os seus documentos.

### Estados de Documento

- **Em Andamento** (`IN_PROGRESS`): Documento criado mas não finalizado - pode continuar editando
- **Concluído** (`COMPLETED`): Documento finalizado - disponível para visualização
- **Erro** (`ERROR`): Documento com erro no processamento

### Persistência Local

Os documentos são armazenados no `localStorage` do navegador com os seguintes dados:

```typescript
{
  documentId: string,
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR',
  createdAt: string,
  lastModified: string,
  continueUrl?: string,
  documentUrl?: string,
  callbackUrl: string
}
```

### Limpeza Automática

- Documentos com mais de **30 dias** são removidos automaticamente
- Máximo de **50 documentos** armazenados
- Você pode excluir documentos manualmente a qualquer momento

### Fluxos Disponíveis

#### 1. Criar Novo Documento
```
/ → Criar Documento → Login → Create → Redirect → Editar → Callback → Status: COMPLETED
```

#### 2. Continuar Documento Existente
```
/documents → Selecionar Documento → Reautenticar → Redirect → Continuar Edição → Callback
```

#### 3. Visualizar Documento Concluído
```
/documents → Selecionar Documento Concluído → Redirect (mode=view) → Visualização
```

### ⚠️ Importante

- Os documentos são armazenados **localmente no navegador**
- Limpar o cache/cookies do navegador **remove todos os documentos** da lista
- Os documentos reais permanecem na CriaAI, apenas a lista local é afetada
- Esta é uma POC - em produção, use backend para gerenciar documentos

