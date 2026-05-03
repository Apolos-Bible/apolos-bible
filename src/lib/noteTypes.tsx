import type { JSX } from 'react'

export type NoteType = 'note' | 'prayer' | 'insight' | 'question' | 'application'

export interface NoteTypeDef {
  type: NoteType
  labelKey: string
  icon: () => JSX.Element
  bgClass: string
  borderClass: string
  indicatorClass: string
  italic: boolean
}

function PrayerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M12 5V3m0 2a7 7 0 0 0-7 7v2a7 7 0 0 1 7 3 7 7 0 0 1 7-3v-2a7 7 0 0 0-7-7z" />
      <path d="M5 12a7 7 0 0 0-3 4m17-4a7 7 0 0 1 3 4" />
    </svg>
  )
}

function InsightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17h4v4h-4z" />
      <path d="M12 3v4" />
      <path d="M12 7a5 5 0 0 1 5 5v3H7v-3a5 5 0 0 1 5-5z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  )
}

function QuestionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ApplicationIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

export const NOTE_TYPES: Record<NoteType, NoteTypeDef> = {
  note: {
    type: 'note',
    labelKey: 'notes.typeNote',
    icon: NoteIcon,
    bgClass: '',
    borderClass: 'border-l-accent/30',
    indicatorClass: 'text-accent/60',
    italic: false,
  },
  prayer: {
    type: 'prayer',
    labelKey: 'notes.typePrayer',
    icon: PrayerIcon,
    bgClass: 'bg-[#c792ea10]',
    borderClass: 'border-l-[#c792ea]',
    indicatorClass: 'text-[#c792ea]',
    italic: true,
  },
  insight: {
    type: 'insight',
    labelKey: 'notes.typeInsight',
    icon: InsightIcon,
    bgClass: 'bg-[#61afef10]',
    borderClass: 'border-l-[#61afef]',
    indicatorClass: 'text-[#61afef]',
    italic: false,
  },
  question: {
    type: 'question',
    labelKey: 'notes.typeQuestion',
    icon: QuestionIcon,
    bgClass: 'bg-[#e5c07b10]',
    borderClass: 'border-l-[#e5c07b]',
    indicatorClass: 'text-[#e5c07b]',
    italic: false,
  },
  application: {
    type: 'application',
    labelKey: 'notes.typeApplication',
    icon: ApplicationIcon,
    bgClass: 'bg-[#98c37910]',
    borderClass: 'border-l-[#98c379]',
    indicatorClass: 'text-[#98c379]',
    italic: false,
  },
}

export const NOTE_TYPE_LIST: NoteTypeDef[] = Object.values(NOTE_TYPES)

export function getNoteTypeDef(type: NoteType | undefined): NoteTypeDef {
  return NOTE_TYPES[type ?? 'note'] ?? NOTE_TYPES.note
}
