'use client'

import { useState, useEffect } from 'react'
import { documentStorage, DocumentMetadata, DocumentStatus } from '@/lib/documentStorage'
import { continueDocument } from '@/lib/continueDocument'
import { getConfig } from '@/lib/config'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = () => {
    const docs = documentStorage.getAll()
    setDocuments(docs)
  }

  const handleContinue = async (doc: DocumentMetadata) => {
    setLoading(doc.documentId)
    setError(null)

    try {
      const config = getConfig()
      
      if (!config.isValid) {
        throw new Error('Configuração inválida. Verifique as variáveis de ambiente.')
      }

      const url = await continueDocument(doc.documentId, config)
      window.location.href = url
    } catch (err: any) {
      setError(err.message || 'Erro ao continuar documento')
      setLoading(null)
    }
  }

  const handleRemove = (documentId: string) => {
    if (confirm('Deseja realmente remover este documento da lista?')) {
      documentStorage.remove(documentId)
      loadDocuments()
    }
  }

  const getStatusConfig = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.IN_PROGRESS:
        return {
          badge: 'Em Andamento',
          color: 'bg-blue-100 text-blue-800',
          icon: '✏️',
          action: 'Continuar'
        }
      case DocumentStatus.COMPLETED:
        return {
          badge: 'Concluído',
          color: 'bg-green-100 text-green-800',
          icon: '✓',
          action: 'Visualizar'
        }
      case DocumentStatus.ERROR:
        return {
          badge: 'Erro',
          color: 'bg-red-100 text-red-800',
          icon: '⚠️',
          action: 'Tentar Novamente'
        }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Meus Documentos
              </h1>
              <p className="text-gray-600">
                Gerencie seus documentos criados na CriaAI
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              + Criar Novo
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-red-800 text-sm font-medium">Erro</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Nenhum documento encontrado
              </h2>
              <p className="text-gray-500 mb-6">
                Você ainda não criou nenhum documento
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
              >
                Criar Primeiro Documento
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const statusConfig = getStatusConfig(doc.status)
                const isLoading = loading === doc.documentId

                return (
                  <div
                    key={doc.documentId}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{statusConfig.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {doc.title || `Documento ${doc.documentId.substring(0, 8)}`}
                            </h3>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
                              {statusConfig.badge}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1 ml-11">
                          <p>
                            <strong>ID:</strong> {doc.documentId}
                          </p>
                          <p>
                            <strong>Criado em:</strong> {formatDate(doc.createdAt)}
                          </p>
                          <p>
                            <strong>Última modificação:</strong> {formatDate(doc.lastModified)}
                          </p>
                          {doc.documentUrl && (
                            <p>
                              <strong>URL:</strong>{' '}
                              <a
                                href={doc.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Baixar documento
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleContinue(doc)}
                          disabled={isLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin">⟳</span>
                              Carregando...
                            </span>
                          ) : (
                            statusConfig.action
                          )}
                        </button>
                        <button
                          onClick={() => handleRemove(doc.documentId)}
                          disabled={isLoading}
                          className="bg-red-100 hover:bg-red-200 disabled:bg-gray-100 text-red-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>
                Total de documentos: <strong>{documents.length}</strong>
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Voltar para início
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
