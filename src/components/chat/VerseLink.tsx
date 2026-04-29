import { useVerseStore } from '@/lib/store/useVerseStore'
import type { Segment } from '@/lib/bibleRefs'

type Props = {
  seg: Extract<Segment, { kind: 'ref' }>
}

export function VerseLink({ seg }: Props) {
  const versions   = useVerseStore(s => s.versions)
  const setVersion = useVerseStore(s => s.setVersion)
  const openVerse  = useVerseStore(s => s.openVerse)

  const handleClick = async () => {
    if (seg.versionAbbr) {
      const match = versions.find(
        v => v.abbreviation.toUpperCase() === seg.versionAbbr!.toUpperCase(),
      )
      if (match) await setVersion(match.id)
    }
    await openVerse(seg.slug, seg.chapter, seg.verse ?? 1)
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      className="text-accent underline cursor-pointer hover:opacity-80"
      title={seg.raw}
    >
      {seg.raw}
    </span>
  )
}
