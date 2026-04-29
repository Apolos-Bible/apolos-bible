import { segmentText } from '@/lib/bibleRefs'
import { VerseLink } from './VerseLink'

export function MessageBody({ text, isMine }: { text: string; isMine?: boolean }) {
  const segments = segmentText(text)

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'text'
          ? <span key={i}>{seg.value}</span>
          : <VerseLink key={i} seg={seg} isMine={isMine} />
      )}
    </>
  )
}
