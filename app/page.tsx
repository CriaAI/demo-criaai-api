'use client'

import { useMemo, useState } from 'react'
import { documentStorage, DocumentStatus } from '@/lib/documentStorage'
import {
  DOCUMENT_TYPES,
  getFieldGroups,
  buildPromptFields,
  FieldDef,
} from '@/lib/documentFields'

/**
 * Página principal do site da Integração (simulação)
 *
 * Este componente:
 * 1. Permite escolher o tipo de documento e preencher os campos opcionais
 * 2. Faz login na API da CriaAI
 * 3. Chama createDocumentExternal com os campos escolhidos
 * 4. Redireciona para a CriaAI com cookies setados
 */
export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'login' | 'create' | 'redirect'>('idle')

  // Seleção do tipo de documento e valores dos campos opcionais
  const [docTypeId, setDocTypeId] = useState<string>(DOCUMENT_TYPES[0].id)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const docType = useMemo(
    () => DOCUMENT_TYPES.find(d => d.id === docTypeId) || DOCUMENT_TYPES[0],
    [docTypeId]
  )
  const fieldGroups = useMemo(
    () => getFieldGroups(docType.documentClassID, docType.documentSubClassID),
    [docType]
  )

  const updateField = (name: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [name]: value }))
  }

  // Configurações da API
  const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://kqa418uhgj.execute-api.sa-east-1.amazonaws.com'
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''
  const CRIAAI_FRONTEND_URL = process.env.NEXT_PUBLIC_CRIAAI_FRONTEND_URL || 'http://localhost:3000'

  // Credenciais do parceiro
  const PARTNER_EMAIL = process.env.NEXT_PUBLIC_PARTNER_EMAIL || 'partner@example.com'
  const PARTNER_PASSWORD = process.env.NEXT_PUBLIC_PARTNER_PASSWORD || 'password123'

  const handleCreateDocument = async () => {
    setLoading(true)
    setError(null)
    setStep('login')

    try {
      // Passo 1: Login do parceiro na API da CriaAI
      // OBS: o endpoint NÃO tem prefixo de stage (/nonprod). A rota real é /auth/login.
      const loginResponse = await fetch(`${AUTH_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          email: PARTNER_EMAIL,
          password: PARTNER_PASSWORD,
          signinMethod: 'email'
        })
      })

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao fazer login')
      }

      const loginData = await loginResponse.json()
      // A resposta pode vir em diferentes formatos, vamos tentar ambos
      const authorization = loginData.data?.authorization || loginData.authorization || loginData.data?.token || loginData.token
      const refreshToken = loginData.data?.refreshToken || loginData.refreshToken

      if (!authorization) {
        console.error('Resposta do login:', loginData)
        throw new Error('Token de autenticação não recebido na resposta')
      }

      setStep('create')

      // Campos de contexto escolhidos pelo integrador (descarta vazios).
      // ATENÇÃO: o create-document rejeita esses campos no topo do body
      // (422 Unknown field). Eles vão aninhados num objeto `prompt`.
      const promptFields = buildPromptFields(
        docType.documentClassID,
        docType.documentSubClassID,
        fieldValues
      )

      // Passo 2: Criar documento externo
      // credentials: 'include' é OBRIGATÓRIO: a API responde com a origin ecoada +
      // Access-Control-Allow-Credentials: true e devolve Set-Cookie (authToken,
      // authRefreshToken, documentId) no Domain=.criaai.com. É assim que a sessão
      // chega autenticada no front — não via token na URL.
      const createBody: Record<string, unknown> = {
        linkCallback: `${typeof window !== 'undefined' ? window.location.origin : ''}/callback?token=demo123`,
        documentType: 'rtf',
        partnerUserId: PARTNER_EMAIL,
        // Tipo de documento escolhido (vai no topo do body)
        documentClassID: docType.documentClassID,
        documentSubClassID: docType.documentSubClassID,
      }
      // Só inclui `prompt` se houver algum campo de contexto preenchido
      if (Object.keys(promptFields).length > 0) {
        createBody.prompt = promptFields
      }
      console.log('📤 [Integração] Body do create-document:', createBody)

      const createResponse = await fetch(`${AUTH_API_URL}/documents/create-document`, {
        method: 'POST',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        credentials: 'include',
        body: JSON.stringify(createBody)
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ao criar documento: ${createResponse.status}`)
      }

      // Verificar se o backend retornou cookies nos headers
      const setCookieHeaders = createResponse.headers.get('set-cookie')
      console.log('🔍 [Integração] Verificando cookies do backend...')
      console.log('🔍 [Integração] Set-Cookie header:', setCookieHeaders)

      if (setCookieHeaders) {
        console.log('✅ Cookies recebidos do backend (Set-Cookie header):', setCookieHeaders)
        // Se o backend setou os cookies, eles já devem estar no navegador
        // Verificar se os cookies foram setados
        const cookiesSet = document.cookie
        console.log('🍪 Cookies atuais no navegador:', cookiesSet)
        console.log('🍪 documentId cookie:', document.cookie.split(';').find(c => c.trim().startsWith('documentId=')))
      }

      const createData = await createResponse.json()
      console.log('Resposta do create-document:', createData)

      // A resposta pode vir em diferentes formatos
      const documentId = createData.data?.documentId || createData.data?.documentID || createData.documentId || createData.documentID
      const docToken = createData.data?.authorization || createData.authorization || authorization
      const docRefreshToken = createData.data?.refreshToken || createData.refreshToken || refreshToken
      const continueUrl = createData.data?.continueUrl || createData.continueUrl

      if (!documentId) {
        console.error('Resposta completa:', createData)
        throw new Error('documentId não recebido na resposta')
      }

      // Salvar documento no localStorage
      documentStorage.save({
        documentId,
        status: DocumentStatus.IN_PROGRESS,
        continueUrl,
        title: docType.label,
        callbackUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/callback`
      })
      console.log('📝 Documento salvo no localStorage:', documentId)

      setStep('redirect')

      // Redirecionar para /documentInput com os parâmetros na query string
      console.log('🔄 [Integração] Redirecionando para trabalhar no documento...')
      console.log('📋 [Integração] Dados do documento:', { documentId, hasToken: !!docToken, hasRefreshToken: !!docRefreshToken })

      const redirectUrl = new URL(`${CRIAAI_FRONTEND_URL}/documentInput`)
      redirectUrl.searchParams.set('documentId', documentId)
      redirectUrl.searchParams.set('token', docToken)
      if (docRefreshToken) {
        redirectUrl.searchParams.set('refreshToken', docRefreshToken)
      }

      console.log('🔗 [Integração] URL de redirect:', redirectUrl.toString())
      console.log('⏳ [Integração] Redirecionando em 500ms...')

      // Pequeno delay para garantir que tudo está processado
      setTimeout(() => {
        window.location.href = redirectUrl.toString()
      }, 500)

    } catch (err: any) {
      setError(err.message || 'Erro desconhecido')
      setLoading(false)
      setStep('idle')
      console.error('Erro no fluxo:', err)
    }
  }

  const renderField = (field: FieldDef) => {
    const value = fieldValues[field.name] || ''
    const baseClass =
      'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100'

    return (
      <div key={field.name} className="space-y-1">
        <label htmlFor={field.name} className="block text-xs font-medium text-gray-700">
          {field.label}
          <code className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-500">{field.name}</code>
        </label>
        {field.type === 'textarea' ? (
          <textarea
            id={field.name}
            value={value}
            disabled={loading}
            placeholder={field.placeholder}
            onChange={e => updateField(field.name, e.target.value)}
            rows={2}
            className={baseClass}
          />
        ) : field.type === 'select' ? (
          <select
            id={field.name}
            value={value}
            disabled={loading}
            onChange={e => updateField(field.name, e.target.value)}
            className={baseClass}
          >
            <option value="">— selecione —</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            id={field.name}
            type={field.type === 'number' ? 'number' : 'text'}
            value={value}
            disabled={loading}
            placeholder={field.placeholder}
            onChange={e => updateField(field.name, e.target.value)}
            className={baseClass}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full my-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Integração
          </h1>
          <p className="text-gray-600">
            Integração com CriaAI
          </p>
        </div>

        <div className="space-y-6">
          {/* Seletor de tipo de documento */}
          <div className="space-y-1">
            <label htmlFor="docType" className="block text-sm font-semibold text-gray-700">
              Tipo de documento
            </label>
            <select
              id="docType"
              value={docTypeId}
              disabled={loading}
              onChange={e => setDocTypeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              {DOCUMENT_TYPES.map(dt => (
                <option key={dt.id} value={dt.id}>{dt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              <code className="rounded bg-gray-100 px-1">documentClassID={docType.documentClassID}</code>{' '}
              <code className="rounded bg-gray-100 px-1">documentSubClassID={docType.documentSubClassID}</code>
            </p>
          </div>

          {/* Campos opcionais dinâmicos */}
          <div className="space-y-5 max-h-[45vh] overflow-y-auto pr-1">
            {fieldGroups.map(group => (
              <fieldset key={group.title} className="space-y-3 rounded-lg border border-gray-200 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {group.title}
                </legend>
                {group.fields.map(renderField)}
              </fieldset>
            ))}
          </div>

          {/* Status Steps */}
          <div className="space-y-3">
            <div className={`flex items-center gap-3 ${step === 'idle' ? 'text-gray-400' : 'text-green-600'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'idle' ? 'bg-gray-300' : 'bg-green-500'}`}>
                {step !== 'idle' && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm font-medium">Pronto para iniciar</span>
            </div>
            <div className={`flex items-center gap-3 ${step === 'login' ? 'text-blue-600' : step !== 'idle' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'login' ? 'bg-blue-500 animate-pulse' : step !== 'idle' ? 'bg-green-500' : 'bg-gray-300'}`}>
                {step === 'login' && <span className="text-white text-xs animate-spin">⟳</span>}
                {step !== 'idle' && step !== 'login' && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm font-medium">Fazendo login na API...</span>
            </div>
            <div className={`flex items-center gap-3 ${step === 'create' ? 'text-blue-600' : step === 'redirect' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'create' ? 'bg-blue-500 animate-pulse' : step === 'redirect' ? 'bg-green-500' : 'bg-gray-300'}`}>
                {step === 'create' && <span className="text-white text-xs animate-spin">⟳</span>}
                {step === 'redirect' && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm font-medium">Criando documento...</span>
            </div>
            <div className={`flex items-center gap-3 ${step === 'redirect' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${step === 'redirect' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}>
                {step === 'redirect' && <span className="text-white text-xs animate-spin">⟳</span>}
              </div>
              <span className="text-sm font-medium">Redirecionando para CriaAI...</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-red-800 text-sm font-medium">Erro</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
            <p className="text-blue-800 text-xs">
              <strong className="font-semibold">Configuração:</strong>
              <br />
              Configure as variáveis de ambiente no arquivo <code className="bg-blue-100 px-1 rounded">.env.local</code>.
              Os campos abaixo são opcionais e vão aninhados em <code className="bg-blue-100 px-1 rounded">prompt</code> no body do <code className="bg-blue-100 px-1 rounded">create-document</code>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCreateDocument}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span>
                  Processando...
                </span>
              ) : (
                'Criar Documento na CriaAI'
              )}
            </button>

            <button
              onClick={() => window.location.href = '/documents'}
              disabled={loading}
              className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors border border-gray-300"
            >
              📋 Meus Documentos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
