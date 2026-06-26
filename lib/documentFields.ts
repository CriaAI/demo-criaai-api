/**
 * Configuração dos tipos de documento e dos campos opcionais aceitos pela API
 * `POST /documents/create-document`.
 *
 * Cada tipo de documento mapeia para um par `documentClassID` / `documentSubClassID`.
 * Os campos opcionais variam conforme esse par — ver `getFieldGroups`.
 *
 * Fonte da verdade dos nomes dos campos: o `Prompt` do front de produção
 * (`CriaAI-V2-Front/src/app/types/prompt.ts`).
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'select'

export interface FieldDef {
  /** Nome do campo enviado no body da API (ex.: 'objetivoDocumento'). */
  name: string
  /** Rótulo exibido no formulário. */
  label: string
  type: FieldType
  placeholder?: string
  /** Opções para campos do tipo 'select'. */
  options?: { value: string; label: string }[]
}

export interface FieldGroup {
  title: string
  fields: FieldDef[]
}

export interface DocumentType {
  id: string
  label: string
  documentClassID: number
  documentSubClassID: number
}

/** Tipos de documento oferecidos, com o respectivo class/subclass. */
export const DOCUMENT_TYPES: DocumentType[] = [
  { id: 'peticao_inicial', label: 'Petição Inicial', documentClassID: 1, documentSubClassID: 1 },
  { id: 'peticao_intermediaria', label: 'Petição Intermediária', documentClassID: 1, documentSubClassID: 2 },
  { id: 'recurso', label: 'Recurso', documentClassID: 1, documentSubClassID: 3 },
  { id: 'contrato', label: 'Contrato', documentClassID: 2, documentSubClassID: 1 },
  { id: 'notificacao', label: 'Notificação', documentClassID: 3, documentSubClassID: 1 },
]

// ---------------------------------------------------------------------------
// Grupos de campos opcionais
// ---------------------------------------------------------------------------

/** Campos comuns a todos os documentClassIDs e documentSubClassIDs. */
const COMMON_FIELDS: FieldDef[] = [
  {
    name: 'tipoPessoa',
    label: 'Tipo de pessoa',
    type: 'select',
    options: [
      { value: 'Pessoa Fisica', label: 'Pessoa Física' },
      { value: 'Pessoa Juridica', label: 'Pessoa Jurídica' },
    ],
  },
  { name: 'areaDoDireito', label: 'Área do Direito', type: 'text', placeholder: 'Ex.: Cível, Trabalhista, Penal...' },
  { name: 'valorDaCausa', label: 'Valor da causa (R$)', type: 'number', placeholder: 'Ex.: 15000.00' },
  { name: 'dadosParteAdvogado', label: 'Dados da parte (cliente/advogado)', type: 'textarea' },
  { name: 'dadosParteContraria', label: 'Dados da parte contrária', type: 'textarea' },
  { name: 'qualificacaoParteAdvogado', label: 'Qualificação da parte (cliente/advogado)', type: 'textarea' },
  { name: 'qualificacaoParteContraria', label: 'Qualificação da parte contrária', type: 'textarea' },
]

/** Campos para documentClassID = 1 (petições) ou 3 (notificações). */
const PETICAO_NOTIFICACAO_FIELDS: FieldDef[] = [
  { name: 'objetivoDocumento', label: 'Objetivo do documento', type: 'textarea' },
  { name: 'tipoDocumento', label: 'Tipo de documento', type: 'text', placeholder: 'Ex.: Ação de cobrança' },
  { name: 'context', label: 'Contexto', type: 'textarea' },
  { name: 'pedidos', label: 'Pedidos', type: 'textarea' },
]

/** Campos para documentClassID = 1 e documentSubClassID = 2 (petição intermediária). */
const PETICAO_INTERMEDIARIA_FIELDS: FieldDef[] = [
  { name: 'tipoDocumentoParteContraria', label: 'Tipo de documento da parte contrária', type: 'text' },
  { name: 'tipoDocumentoParteAdvogado', label: 'Tipo de documento da parte (cliente/advogado)', type: 'text' },
  { name: 'contextParteContraria', label: 'Contexto da parte contrária', type: 'textarea' },
  { name: 'contextParteAdvogado', label: 'Contexto da parte (cliente/advogado)', type: 'textarea' },
  { name: 'pedidosParteContraria', label: 'Pedidos da parte contrária', type: 'textarea' },
  { name: 'pedidosParteAdvogado', label: 'Pedidos da parte (cliente/advogado)', type: 'textarea' },
  { name: 'argumentoParteContraria', label: 'Argumento da parte contrária', type: 'textarea' },
]

/** Campos para documentClassID = 1 e documentSubClassID = 3 (recursos). */
const RECURSO_FIELDS: FieldDef[] = [
  { name: 'recursoPrincipal', label: 'Recurso principal', type: 'textarea' },
  { name: 'pontosRecorridos', label: 'Pontos recorridos', type: 'textarea' },
]

/** Campos para documentClassID = 2 (contratos). */
const CONTRATO_FIELDS: FieldDef[] = [
  { name: 'objetoDocumento', label: 'Objeto do documento', type: 'textarea' },
  { name: 'requisitos', label: 'Requisitos', type: 'textarea' },
]

/** Campos para documentClassID = 3 (notificações). */
const NOTIFICACAO_FIELDS: FieldDef[] = [
  { name: 'embasamento', label: 'Embasamento', type: 'textarea' },
]

/**
 * Retorna os grupos de campos opcionais aplicáveis a um tipo de documento,
 * conforme o seu documentClassID / documentSubClassID.
 */
export function getFieldGroups(documentClassID: number, documentSubClassID: number): FieldGroup[] {
  const groups: FieldGroup[] = [{ title: 'Campos comuns', fields: COMMON_FIELDS }]

  if (documentClassID === 1 || documentClassID === 3) {
    groups.push({ title: 'Petições / Notificações', fields: PETICAO_NOTIFICACAO_FIELDS })
  }
  if (documentClassID === 1 && documentSubClassID === 2) {
    groups.push({ title: 'Petição intermediária', fields: PETICAO_INTERMEDIARIA_FIELDS })
  }
  if (documentClassID === 1 && documentSubClassID === 3) {
    groups.push({ title: 'Recurso', fields: RECURSO_FIELDS })
  }
  if (documentClassID === 2) {
    groups.push({ title: 'Contrato', fields: CONTRATO_FIELDS })
  }
  if (documentClassID === 3) {
    groups.push({ title: 'Notificação', fields: NOTIFICACAO_FIELDS })
  }

  return groups
}

/** Nomes de todos os campos válidos para um dado tipo de documento. */
export function getFieldNames(documentClassID: number, documentSubClassID: number): string[] {
  return getFieldGroups(documentClassID, documentSubClassID).flatMap(g => g.fields.map(f => f.name))
}

/**
 * Monta o objeto de campos opcionais a partir dos valores preenchidos,
 * descartando vazios e convertendo `valorDaCausa` para número.
 */
export function buildExtraFields(
  documentClassID: number,
  documentSubClassID: number,
  values: Record<string, string>
): Record<string, string | number> {
  const validNames = new Set(getFieldNames(documentClassID, documentSubClassID))
  const extra: Record<string, string | number> = {}

  for (const [name, rawValue] of Object.entries(values)) {
    if (!validNames.has(name)) continue
    const value = rawValue?.trim()
    if (!value) continue

    if (name === 'valorDaCausa') {
      const parsed = parseFloat(value.replace(',', '.'))
      if (!isNaN(parsed)) extra[name] = parsed
      continue
    }

    extra[name] = value
  }

  return extra
}
