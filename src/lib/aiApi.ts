import { api } from './api'
import type { ChatMessage } from './chatApi'

export interface AiUsageSummary {
  period: string
  input_tokens: number
  input_cached_tokens: number
  output_tokens: number
  tokens_used: number
  tokens_limit: number
  tokens_remaining: number
  percent_used: number
  request_count: number
}

export interface AiVerseQuestionRequest {
  verse_id: number
  question: string
}

export interface AiVerseQuestionResponse {
  answer: string
  reference: string
  verse_id: number | null
  usage: AiUsageSummary
}

export interface AiCanvasContextNode {
  id: string
  type: string
  reference?: string
  text?: string
}

export interface AiCanvasContextEdge {
  source: string
  target: string
  kind?: string
}

/**
 * Invoke the study assistant from the unified study chat ("@tulia ..."). The
 * server builds the conversation context itself; the client sends the prompt
 * (mention already stripped is fine too), the linked conversation, and the
 * current canvas snapshot (which only the client can see).
 */
/** Extracted text of an attached PDF, sent as grounding context (never auto-added to the canvas). */
export interface AiContextDocument {
  name?: string
  text: string
}

export interface AiStudyChatRequest {
  session_id: string
  conversation_id: number
  version_id?: number
  prompt: string
  canvas?: { nodes: AiCanvasContextNode[]; edges: AiCanvasContextEdge[] }
  documents?: AiContextDocument[]
}

/**
 * A canvas mutation the backend asks the client to apply to the shared Yjs doc.
 * 'add_node' carries a model-assigned temp_id (referenced by later 'connect'
 * ops) plus the resolved node data; 'connect' links two nodes by temp_id or by
 * an existing canvas node id.
 */
export interface AiCanvasMutation {
  op: 'add_node' | 'connect'
  // add_node
  temp_id?: string
  type?: string
  data?: Record<string, unknown>
  // connect
  source?: string
  target?: string
  label?: string
  kind?: string
}

export interface AiStudyChatResponse {
  /** Tulia's reply, persisted as a real bot message in the conversation. */
  message: ChatMessage
  mutations: AiCanvasMutation[]
  usage: AiUsageSummary
}

export interface AiIngestDocumentResponse {
  message: string
  mutations: AiCanvasMutation[]
  truncated: boolean
  usage: AiUsageSummary
}

/** Result of token-free PDF text extraction (PDF attached as chat context). */
export interface AiExtractDocumentResponse {
  name: string
  text: string
  truncated: boolean
}

export const aiApi = {
  usage: () => api.get<AiUsageSummary>('/api/ai/usage'),
  verseQuestion: (body: AiVerseQuestionRequest) =>
    api.post<AiVerseQuestionResponse>('/api/ai/verse-question', body),
  studyChat: (body: AiStudyChatRequest) =>
    api.post<AiStudyChatResponse>('/api/ai/study-chat', body),
  ingestDocument: (sessionId: string, file: File, versionId?: number) => {
    const form = new FormData()
    form.append('session_id', sessionId)
    if (versionId != null) form.append('version_id', String(versionId))
    form.append('document', file)
    return api.upload<AiIngestDocumentResponse>('/api/ai/ingest-document', form)
  },
  extractDocument: (sessionId: string, file: File) => {
    const form = new FormData()
    form.append('session_id', sessionId)
    form.append('document', file)
    return api.upload<AiExtractDocumentResponse>('/api/ai/extract-document', form)
  },
}
