import { documentStorage, DocumentMetadata, DocumentStatus } from './documentStorage'

interface Config {
  apiBaseUrl: string
  authApiUrl: string
  stage: string
  criaaiFrontendUrl: string
  apiKey: string
  partnerEmail: string
  partnerPassword: string
}

async function login(config: Config): Promise<string> {
  const response = await fetch(`${config.authApiUrl}/${config.stage}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey
    },
    body: JSON.stringify({
      email: config.partnerEmail,
      password: config.partnerPassword,
      signinMethod: 'email'
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erro ao fazer login')
  }

  const data = await response.json()
  const authorization = data.data?.authorization || data.authorization || data.data?.token || data.token

  if (!authorization) {
    throw new Error('Token de autenticação não recebido')
  }

  return authorization
}

async function callContinueDocumentApi(
  documentId: string,
  token: string,
  config: Config
): Promise<string> {
  const apiUrl = `${config.apiBaseUrl}/documents/continue-document/${documentId}`
  
  console.log('🔄 Chamando continue-document API:', apiUrl)
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'Authorization': `Bearer ${token}`,
      'Origin': config.criaaiFrontendUrl
    },
    credentials: 'include'
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('❌ Erro na API continue-document:', errorData)
    throw new Error(errorData.error || errorData.message || 'Erro ao continuar documento')
  }

  const data = await response.json()
  console.log('✅ Resposta continue-document:', data)
  
  const continueUrl = data.data?.continueUrl || data.continueUrl
  
  if (!continueUrl) {
    console.warn('⚠️ continueUrl não recebida, usando fallback')
    const fallbackUrl = new URL(`${config.criaaiFrontendUrl}/documentInput`)
    fallbackUrl.searchParams.set('documentId', documentId)
    fallbackUrl.searchParams.set('token', token)
    return fallbackUrl.toString()
  }
  
  return continueUrl
}

export async function continueDocument(
  documentId: string,
  config: Config
): Promise<string> {
  const doc = documentStorage.getById(documentId)
  
  if (!doc) {
    throw new Error('Documento não encontrado no armazenamento local')
  }

  console.log('🔐 Fazendo login...')
  const token = await login(config)
  
  console.log('📞 Chamando API continue-document...')
  const continueUrl = await callContinueDocumentApi(documentId, token, config)
  
  console.log('🔗 URL de continuação:', continueUrl)
  return continueUrl
}
