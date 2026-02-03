/**
 * Configuração centralizada e validação de variáveis de ambiente
 * para a integração Integração x CriaAI
 */

interface Config {
  // URLs da API
  apiBaseUrl: string
  authApiUrl: string
  stage: string
  criaaiFrontendUrl: string

  // Credenciais
  apiKey: string
  partnerEmail: string
  partnerPassword: string

  // Validação
  isValid: boolean
  errors: string[]
}

/**
 * Valida e retorna a configuração da aplicação
 */
export function getConfig(): Config {
  const errors: string[] = []

  // URLs obrigatórias
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_URL
  const criaaiFrontendUrl = process.env.NEXT_PUBLIC_CRIAAI_FRONTEND_URL
  const stage = process.env.NEXT_PUBLIC_STAGE

  // Credenciais obrigatórias
  const apiKey = process.env.NEXT_PUBLIC_API_KEY
  const partnerEmail = process.env.NEXT_PUBLIC_PARTNER_EMAIL
  const partnerPassword = process.env.NEXT_PUBLIC_PARTNER_PASSWORD

  // Validações
  if (!apiBaseUrl) {
    errors.push('NEXT_PUBLIC_API_BASE_URL não está configurada')
  }

  if (!authApiUrl) {
    errors.push('NEXT_PUBLIC_AUTH_API_URL não está configurada')
  }

  if (!criaaiFrontendUrl) {
    errors.push('NEXT_PUBLIC_CRIAAI_FRONTEND_URL não está configurada')
  }

  if (!stage) {
    errors.push('NEXT_PUBLIC_STAGE não está configurada')
  }

  if (!apiKey) {
    errors.push('NEXT_PUBLIC_API_KEY não está configurada')
  }

  if (!partnerEmail) {
    errors.push('NEXT_PUBLIC_PARTNER_EMAIL não está configurada')
  }

  if (!partnerPassword) {
    errors.push('NEXT_PUBLIC_PARTNER_PASSWORD não está configurada')
  }

  // Validação de URLs
  if (apiBaseUrl && !isValidUrl(apiBaseUrl)) {
    errors.push('NEXT_PUBLIC_API_BASE_URL não é uma URL válida')
  }

  if (authApiUrl && !isValidUrl(authApiUrl)) {
    errors.push('NEXT_PUBLIC_AUTH_API_URL não é uma URL válida')
  }

  if (criaaiFrontendUrl && !isValidUrl(criaaiFrontendUrl)) {
    errors.push('NEXT_PUBLIC_CRIAAI_FRONTEND_URL não é uma URL válida')
  }

  // Validação de email
  if (partnerEmail && !isValidEmail(partnerEmail)) {
    errors.push('PARTNER_EMAIL não é um email válido')
  }

  return {
    apiBaseUrl: apiBaseUrl || '',
    authApiUrl: authApiUrl || '',
    stage: stage || 'nonprod',
    criaaiFrontendUrl: criaaiFrontendUrl || '',
    apiKey: apiKey || '',
    partnerEmail: partnerEmail || '',
    partnerPassword: partnerPassword || '',
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Valida se uma string é uma URL válida
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Valida se uma string é um email válido
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Lança erro se a configuração não for válida
 */
export function validateConfig(): void {
  const config = getConfig()

  if (!config.isValid) {
    const errorMessage = [
      '❌ Configuração inválida. Verifique as seguintes variáveis de ambiente:',
      ...config.errors.map(error => `   - ${error}`),
      '',
      'Configure as variáveis no arquivo .env.local na raiz do projeto.'
    ].join('\n')

    throw new Error(errorMessage)
  }
}

