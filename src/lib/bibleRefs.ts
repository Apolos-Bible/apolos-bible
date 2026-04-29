export type Segment =
  | { kind: 'text'; value: string }
  | {
      kind: 'ref'
      raw: string
      slug: string
      chapter: number
      verse: number | null
      endVerse: number | null
      versionAbbr: string | null
    }

// key: lowercase alias (spaces allowed), value: verbum API book slug.
// If slugs from your API differ, update the values here.
// Verify with: useVerseStore.getState().books.map(b => [b.number, b.slug])
export const BOOK_ALIASES: Record<string, string> = {
  // Genesis (1)
  genesis: 'genesis', génesis: 'genesis', gen: 'genesis', gn: 'genesis',
  // Exodus (2)
  exodus: 'exodus', éxodo: 'exodus', exodo: 'exodus', exo: 'exodus', ex: 'exodus',
  // Leviticus (3)
  leviticus: 'leviticus', 'levítico': 'leviticus', levitico: 'leviticus', lev: 'leviticus', lv: 'leviticus',
  // Numbers (4)
  numbers: 'numbers', 'números': 'numbers', numeros: 'numbers', num: 'numbers', nm: 'numbers',
  // Deuteronomy (5)
  deuteronomy: 'deuteronomy', deuteronomio: 'deuteronomy', deut: 'deuteronomy', deu: 'deuteronomy', dt: 'deuteronomy',
  // Joshua (6)
  joshua: 'joshua', 'josué': 'joshua', josue: 'joshua', jos: 'joshua',
  // Judges (7)
  judges: 'judges', jueces: 'judges', judg: 'judges', jdg: 'judges', jue: 'judges',
  // Ruth (8)
  ruth: 'ruth', rut: 'ruth', rt: 'ruth',
  // 1 Samuel (9)
  '1 samuel': '1-samuel', '1samuel': '1-samuel', '1 sam': '1-samuel', '1sam': '1-samuel', '1sa': '1-samuel',
  // 2 Samuel (10)
  '2 samuel': '2-samuel', '2samuel': '2-samuel', '2 sam': '2-samuel', '2sam': '2-samuel', '2sa': '2-samuel',
  // 1 Kings (11)
  '1 kings': '1-kings', '1kings': '1-kings', '1 reyes': '1-kings', '1reyes': '1-kings', '1ki': '1-kings', '1rey': '1-kings',
  // 2 Kings (12)
  '2 kings': '2-kings', '2kings': '2-kings', '2 reyes': '2-kings', '2reyes': '2-kings', '2ki': '2-kings', '2rey': '2-kings',
  // 1 Chronicles (13)
  '1 chronicles': '1-chronicles', '1chronicles': '1-chronicles',
  '1 crónicas': '1-chronicles', '1 cronicas': '1-chronicles', '1cronicas': '1-chronicles',
  '1ch': '1-chronicles', '1cr': '1-chronicles',
  // 2 Chronicles (14)
  '2 chronicles': '2-chronicles', '2chronicles': '2-chronicles',
  '2 crónicas': '2-chronicles', '2 cronicas': '2-chronicles', '2cronicas': '2-chronicles',
  '2ch': '2-chronicles', '2cr': '2-chronicles',
  // Ezra (15)
  ezra: 'ezra', esdras: 'ezra', ezr: 'ezra', esd: 'ezra',
  // Nehemiah (16)
  nehemiah: 'nehemiah', 'nehemías': 'nehemiah', nehemias: 'nehemiah', neh: 'nehemiah',
  // Esther (17)
  esther: 'esther', ester: 'esther', est: 'esther',
  // Job (18)
  job: 'job',
  // Psalms (19)
  psalms: 'psalms', psalm: 'psalms', salmos: 'psalms', salmo: 'psalms', psa: 'psalms', sal: 'psalms', ps: 'psalms',
  // Proverbs (20)
  proverbs: 'proverbs', proverbios: 'proverbs', prov: 'proverbs', prv: 'proverbs', pr: 'proverbs',
  // Ecclesiastes (21)
  ecclesiastes: 'ecclesiastes', 'eclesiastés': 'ecclesiastes', eclesiastes: 'ecclesiastes', eccl: 'ecclesiastes', ec: 'ecclesiastes',
  // Song of Solomon (22)
  'song of solomon': 'song-of-solomon', 'song of songs': 'song-of-solomon',
  'cantar de cantares': 'song-of-solomon', song: 'song-of-solomon', ss: 'song-of-solomon', cnt: 'song-of-solomon',
  // Isaiah (23)
  isaiah: 'isaiah', 'isaías': 'isaiah', isaias: 'isaiah', isa: 'isaiah', is: 'isaiah',
  // Jeremiah (24)
  jeremiah: 'jeremiah', 'jeremías': 'jeremiah', jeremias: 'jeremiah', jer: 'jeremiah',
  // Lamentations (25)
  lamentations: 'lamentations', lamentaciones: 'lamentations', lam: 'lamentations',
  // Ezekiel (26)
  ezekiel: 'ezekiel', ezequiel: 'ezekiel', ezk: 'ezekiel', eze: 'ezekiel', ez: 'ezekiel',
  // Daniel (27)
  daniel: 'daniel', dan: 'daniel', dn: 'daniel',
  // Hosea (28)
  hosea: 'hosea', oseas: 'hosea', hos: 'hosea',
  // Joel (29)
  joel: 'joel', jl: 'joel',
  // Amos (30)
  amos: 'amos', 'amós': 'amos', amo: 'amos',
  // Obadiah (31)
  obadiah: 'obadiah', 'abdías': 'obadiah', abdias: 'obadiah', abd: 'obadiah', ob: 'obadiah',
  // Jonah (32)
  jonah: 'jonah', 'jonás': 'jonah', jonas: 'jonah', jon: 'jonah',
  // Micah (33)
  micah: 'micah', miqueas: 'micah', mic: 'micah',
  // Nahum (34)
  nahum: 'nahum', 'nahúm': 'nahum', nah: 'nahum',
  // Habakkuk (35)
  habakkuk: 'habakkuk', habacuc: 'habakkuk', hab: 'habakkuk',
  // Zephaniah (36)
  zephaniah: 'zephaniah', 'sofonías': 'zephaniah', sofonias: 'zephaniah', zeph: 'zephaniah', zep: 'zephaniah', sof: 'zephaniah',
  // Haggai (37)
  haggai: 'haggai', hageo: 'haggai', hag: 'haggai',
  // Zechariah (38)
  zechariah: 'zechariah', 'zacarías': 'zechariah', zacarias: 'zechariah', zech: 'zechariah', zac: 'zechariah',
  // Malachi (39)
  malachi: 'malachi', 'malaquías': 'malachi', malaquias: 'malachi', mal: 'malachi',
  // Matthew (40)
  matthew: 'matthew', mateo: 'matthew', mat: 'matthew', mt: 'matthew',
  // Mark (41)
  mark: 'mark', marcos: 'mark', mar: 'mark', mk: 'mark', mc: 'mark', mr: 'mark',
  // Luke (42)
  luke: 'luke', lucas: 'luke', luc: 'luke', lk: 'luke', lc: 'luke',
  // John (43)
  john: 'john', juan: 'john', jn: 'john',
  // Acts (44)
  acts: 'acts', act: 'acts', hechos: 'acts', hch: 'acts',
  // Romans (45)
  romans: 'romans', romanos: 'romans', rom: 'romans', ro: 'romans',
  // 1 Corinthians (46)
  '1 corinthians': '1-corinthians', '1corinthians': '1-corinthians',
  '1 corintios': '1-corinthians', '1corintios': '1-corinthians',
  '1cor': '1-corinthians', '1co': '1-corinthians',
  // 2 Corinthians (47)
  '2 corinthians': '2-corinthians', '2corinthians': '2-corinthians',
  '2 corintios': '2-corinthians', '2corintios': '2-corinthians',
  '2cor': '2-corinthians', '2co': '2-corinthians',
  // Galatians (48)
  galatians: 'galatians', 'gálatas': 'galatians', galatas: 'galatians', gal: 'galatians', ga: 'galatians',
  // Ephesians (49)
  ephesians: 'ephesians', efesios: 'ephesians', eph: 'ephesians', ef: 'ephesians',
  // Philippians (50)
  philippians: 'philippians', filipenses: 'philippians', php: 'philippians', flp: 'philippians', fil: 'philippians',
  // Colossians (51)
  colossians: 'colossians', colosenses: 'colossians', col: 'colossians',
  // 1 Thessalonians (52)
  '1 thessalonians': '1-thessalonians', '1thessalonians': '1-thessalonians',
  '1 tesalonicenses': '1-thessalonians', '1tesalonicenses': '1-thessalonians',
  '1thes': '1-thessalonians', '1tes': '1-thessalonians', '1th': '1-thessalonians', '1ts': '1-thessalonians',
  // 2 Thessalonians (53)
  '2 thessalonians': '2-thessalonians', '2thessalonians': '2-thessalonians',
  '2 tesalonicenses': '2-thessalonians', '2tesalonicenses': '2-thessalonians',
  '2thes': '2-thessalonians', '2tes': '2-thessalonians', '2th': '2-thessalonians', '2ts': '2-thessalonians',
  // 1 Timothy (54)
  '1 timothy': '1-timothy', '1timothy': '1-timothy',
  '1 timoteo': '1-timothy', '1timoteo': '1-timothy',
  '1tim': '1-timothy', '1ti': '1-timothy',
  // 2 Timothy (55)
  '2 timothy': '2-timothy', '2timothy': '2-timothy',
  '2 timoteo': '2-timothy', '2timoteo': '2-timothy',
  '2tim': '2-timothy', '2ti': '2-timothy',
  // Titus (56)
  titus: 'titus', tito: 'titus', tit: 'titus', tt: 'titus',
  // Philemon (57)
  philemon: 'philemon', 'filemón': 'philemon', filemon: 'philemon', phm: 'philemon', flm: 'philemon',
  // Hebrews (58)
  hebrews: 'hebrews', hebreos: 'hebrews', heb: 'hebrews',
  // James (59)
  james: 'james', santiago: 'james', jas: 'james', stg: 'james',
  // 1 Peter (60)
  '1 peter': '1-peter', '1peter': '1-peter',
  '1 pedro': '1-peter', '1pedro': '1-peter',
  '1pet': '1-peter', '1pt': '1-peter', '1pe': '1-peter',
  // 2 Peter (61)
  '2 peter': '2-peter', '2peter': '2-peter',
  '2 pedro': '2-peter', '2pedro': '2-peter',
  '2pet': '2-peter', '2pt': '2-peter', '2pe': '2-peter',
  // 1 John (62)
  '1 john': '1-john', '1john': '1-john',
  '1 juan': '1-john', '1juan': '1-john',
  '1jn': '1-john', '1jua': '1-john',
  // 2 John (63)
  '2 john': '2-john', '2john': '2-john',
  '2 juan': '2-john', '2juan': '2-john',
  '2jn': '2-john', '2jua': '2-john',
  // 3 John (64)
  '3 john': '3-john', '3john': '3-john',
  '3 juan': '3-john', '3juan': '3-john',
  '3jn': '3-john', '3jua': '3-john',
  // Jude (65)
  jude: 'jude', judas: 'jude', jud: 'jude',
  // Revelation (66)
  revelation: 'revelation', apocalipsis: 'revelation', apo: 'revelation', rev: 'revelation', rv: 'revelation', ap: 'revelation',
}

// Version prefix is detected separately (strict uppercase) to avoid matching
// common lowercase words like "out" or "lee" due to the case-insensitive flag.
const VERSION_BEFORE = /([A-Z][A-Z0-9]{1,5})\s+$/

function buildPattern(): RegExp {
  const sorted = Object.keys(BOOK_ALIASES).sort((a, b) => b.length - a.length)
  const bookAlt = sorted
    .map(k => k.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'))
    .join('|')
  return new RegExp(
    `(${bookAlt})\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3})(?:\\s*-\\s*(\\d{1,3}))?)?`,
    'gi',
  )
}

const PATTERN = buildPattern()

export function segmentText(text: string): Segment[] {
  if (!text) return []

  const pattern = new RegExp(PATTERN.source, PATTERN.flags)
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const [full, bookRaw, chapterStr, verseStr, endVerseStr] = match
    const normalizedBook = bookRaw.toLowerCase().replace(/\s+/g, ' ').trim()
    const slug = BOOK_ALIASES[normalizedBook]
    if (!slug) continue

    // If the alias is immediately followed by digits (no space) and there's no
    // verse (no colon), it's likely part of a version token like "RV60" — skip.
    const charAfterBook = text[match.index + bookRaw.length] ?? ''
    if (!/\s/.test(charAfterBook) && !verseStr) continue

    // Check for a strictly-uppercase version prefix immediately before this match
    const before = text.slice(0, match.index)
    const versionMatch = VERSION_BEFORE.exec(before)
    const versionAbbr = versionMatch ? versionMatch[1] : null
    const matchStart = versionMatch ? match.index - versionMatch[0].length : match.index
    const raw = text.slice(matchStart, match.index + full.length)

    if (matchStart > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, matchStart) })
    }

    segments.push({
      kind: 'ref',
      raw,
      slug,
      chapter: parseInt(chapterStr, 10),
      verse: verseStr ? parseInt(verseStr, 10) : null,
      endVerse: endVerseStr ? parseInt(endVerseStr, 10) : null,
      versionAbbr,
    })

    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return segments
}
