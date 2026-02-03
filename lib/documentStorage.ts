export enum DocumentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface DocumentMetadata {
  documentId: string
  status: DocumentStatus
  createdAt: string
  lastModified: string
  continueUrl?: string
  documentUrl?: string
  callbackUrl: string
  title?: string
}

const STORAGE_KEY = 'criaai_documents'
const MAX_DOCUMENTS = 50
const MAX_AGE_DAYS = 30

export const documentStorage = {
  save(doc: Partial<DocumentMetadata> & { documentId: string; callbackUrl: string }): void {
    const docs = this.getAll()
    const existingIndex = docs.findIndex(d => d.documentId === doc.documentId)
    
    const now = new Date().toISOString()
    
    if (existingIndex >= 0) {
      docs[existingIndex] = {
        ...docs[existingIndex],
        ...doc,
        lastModified: now
      }
    } else {
      const newDoc: DocumentMetadata = {
        documentId: doc.documentId,
        status: doc.status || DocumentStatus.IN_PROGRESS,
        createdAt: now,
        lastModified: now,
        continueUrl: doc.continueUrl,
        documentUrl: doc.documentUrl,
        callbackUrl: doc.callbackUrl,
        title: doc.title
      }
      docs.push(newDoc)
    }
    
    this._cleanup(docs)
    this._save(docs)
  },

  getAll(): DocumentMetadata[] {
    if (typeof window === 'undefined') return []
    
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading documents from storage:', error)
      return []
    }
  },

  getById(id: string): DocumentMetadata | null {
    const docs = this.getAll()
    return docs.find(d => d.documentId === id) || null
  },

  updateStatus(id: string, status: DocumentStatus, documentUrl?: string): void {
    const docs = this.getAll()
    const doc = docs.find(d => d.documentId === id)
    
    if (doc) {
      doc.status = status
      doc.lastModified = new Date().toISOString()
      if (documentUrl) {
        doc.documentUrl = documentUrl
      }
      this._save(docs)
    }
  },

  remove(id: string): void {
    const docs = this.getAll().filter(d => d.documentId !== id)
    this._save(docs)
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  },

  _cleanup(docs: DocumentMetadata[]): void {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS)
    
    const cleaned = docs
      .filter(d => new Date(d.lastModified) > cutoff)
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, MAX_DOCUMENTS)
    
    if (cleaned.length < docs.length) {
      console.log(`Cleaned ${docs.length - cleaned.length} old documents`)
    }
  },

  _save(docs: DocumentMetadata[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
      } catch (error) {
        console.error('Error saving documents to storage:', error)
      }
    }
  }
}
