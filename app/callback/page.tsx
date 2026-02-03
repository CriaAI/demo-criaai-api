'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { documentStorage, DocumentStatus } from '@/lib/documentStorage'

/**
 * Componente que usa useSearchParams - deve estar dentro de Suspense
 */
function CallbackContent() {
  const searchParams = useSearchParams()
  const [params, setParams] = useState<Record<string, string>>({})

  useEffect(() => {
    const paramsObj: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      paramsObj[key] = value
    })
    setParams(paramsObj)
    
    // Atualizar status do documento quando callback for recebido
    const success = paramsObj.success === 'True'
    const documentId = paramsObj.documentId || paramsObj.document_id
    const documentUrl = paramsObj.document_url
    
    if (documentId) {
      if (success) {
        console.log('✅ Documento finalizado com sucesso:', documentId)
        documentStorage.updateStatus(documentId, DocumentStatus.COMPLETED, documentUrl)
      } else {
        console.log('❌ Erro ao processar documento:', documentId)
        documentStorage.updateStatus(documentId, DocumentStatus.ERROR)
      }
    }
  }, [searchParams])

  const success = params.success === 'True'
  const message = params.message || ''
  const documentUrl = params.document_url || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Integração
          </h1>
          <p className="text-gray-600">
            Documento Finalizado
          </p>
        </div>

        <div className="space-y-4">
          {success ? (
            <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h2 className="text-green-800 font-semibold mb-2 flex items-center gap-2">
                    <span className="text-2xl">✓</span>
                    Sucesso!
                  </h2>
                  <p className="text-green-700 text-sm">{message}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                    <span className="text-2xl">✗</span>
                    Erro
                  </h2>
                  <p className="text-red-700 text-sm">{message || 'Erro desconhecido'}</p>
                </div>
              </div>
            </div>
          )}

          {documentUrl && (
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
              <h3 className="text-blue-800 font-semibold mb-2">URL do Documento:</h3>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm break-all underline block"
              >
                {documentUrl}
              </a>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Baixar Documento
              </a>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-800 font-semibold mb-2">Parâmetros Recebidos:</h3>
            <pre className="text-xs text-gray-600 overflow-auto bg-white p-2 rounded border">
              {JSON.stringify(params, null, 2)}
            </pre>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/documents'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              📋 Ver Meus Documentos
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors border border-gray-300"
            >
              + Criar Novo Documento
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente de loading para o Suspense
 */
function CallbackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Integração
          </h1>
          <p className="text-gray-600">
            Carregando...
          </p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  )
}

/**
 * Página de callback que recebe o retorno após finalização do documento na CriaAI
 */
export default function CallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <CallbackContent />
    </Suspense>
  )
}

