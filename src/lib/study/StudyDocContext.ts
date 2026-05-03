import { createContext } from 'react'
import * as Y from 'yjs'

export const StudyDocContext = createContext<Y.Doc | null>(null)
