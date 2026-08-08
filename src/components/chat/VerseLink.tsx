import { useNavigate } from 'react-router-dom'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import type { Segment } from '@/lib/bibleRefs'
import { paths } from '@/router/paths'

type Props = {
  seg: Extract<Segment, { kind: 'ref' }>
  isMine?: boolean
}

export function VerseLink({ seg, isMine }: Props) {
  const navigate   = useNavigate()
  const versions   = useVerseStore(s => s.versions)
  const setVersion = useVerseStore(s => s.setVersion)
  const locale     = useUIStore(s => s.locale)

  const handleClick = async () => {
    if (seg.versionAbbr) {
      const match = versions.find(
        v => v.abbreviation.toUpperCase() === seg.versionAbbr!.toUpperCase(),
      )
      if (match) await setVersion(match.id)
    }
    navigate(paths.bible({
      lang: locale,
      book: seg.slug,
      chapter: seg.chapter,
      verse: seg.verse ?? 1,
    }))
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        void handleClick()
      }}
      className={isMine ? 'text-bg-primary underline cursor-pointer hover:opacity-70' : 'text-accent underline cursor-pointer hover:opacity-80'}
      title={seg.raw}
    >
      {seg.raw}
    </span>
  )
}
