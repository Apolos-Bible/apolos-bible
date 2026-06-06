import { useContext, useEffect, useState } from 'react'
import { StudyDocContext } from '@/lib/study/StudyDocContext'
import {
  getAiDocumentsArray,
  addAiDocument,
  removeAiDocument,
  type StoredAiDocument,
} from '@/lib/study/yDocHelpers'

/**
 * Reactive view of the study's attached AI context documents (extracted PDFs
 * shared as grounding context for Apolos). Backed by a Y.Array in the shared
 * doc, so attachments and removals sync to every participant in real time.
 *
 * Returns empty state when used outside a study (no StudyDocContext provider),
 * which is how the chat composer knows to hide the attach affordance.
 */
export function useAiDocuments() {
  const doc = useContext(StudyDocContext)
  const [documents, setDocuments] = useState<StoredAiDocument[]>([])

  useEffect(() => {
    if (!doc) {
      setDocuments([])
      return
    }
    const arr = getAiDocumentsArray(doc)
    const sync = () => setDocuments(arr.toArray())
    sync()
    arr.observe(sync)
    return () => arr.unobserve(sync)
  }, [doc])

  return {
    available: doc !== null,
    documents,
    add: (document: StoredAiDocument) => {
      if (doc) addAiDocument(doc, document)
    },
    remove: (id: string) => {
      if (doc) removeAiDocument(doc, id)
    },
  }
}
