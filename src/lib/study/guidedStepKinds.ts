import type { LucideIcon } from 'lucide-react'
import {
  Sunrise, Landmark, BookOpen, GraduationCap, MessagesSquare,
  HeartHandshake, Footprints, HandHeart, History, Brain,
} from 'lucide-react'
import type { GuidedStepKind } from '@/lib/study/guidedApi'

/**
 * How a step's body reads:
 *
 *  - `aside`  a stage direction — "read the passage out loud" — set small and
 *             quiet, which is what the imported studies use it for.
 *  - `prose`  something to actually read: background, a teaching, a prayer.
 *  - `verse`  Scripture itself, set as a quotation.
 */
export type StepBodyStyle = 'aside' | 'prose' | 'verse'

export interface StepKindSpec {
  kind: GuidedStepKind
  Icon: LucideIcon
  /** Does this kind point at Scripture? */
  takesReference: boolean
  /** Does it hold questions? */
  takesPrompts: boolean
  bodyStyle: StepBodyStyle
}

/**
 * Every kind of step, in the order a study normally flows. Keep in step with
 * `GuidedStudyStep::KINDS` on the backend — that list is what validation
 * accepts, this one is what the editor offers and the panel styles.
 *
 * Labels live in i18n as `guided.kind.<kind>`, the one-line explanations as
 * `path.kindHint.<kind>`.
 */
export const STEP_KINDS: StepKindSpec[] = [
  { kind: 'intro',       Icon: Sunrise,        takesReference: false, takesPrompts: true,  bodyStyle: 'aside' },
  { kind: 'context',     Icon: Landmark,       takesReference: true,  takesPrompts: true,  bodyStyle: 'prose' },
  { kind: 'passage',     Icon: BookOpen,       takesReference: true,  takesPrompts: true,  bodyStyle: 'aside' },
  { kind: 'teaching',    Icon: GraduationCap,  takesReference: true,  takesPrompts: true,  bodyStyle: 'prose' },
  { kind: 'discussion',  Icon: MessagesSquare, takesReference: false, takesPrompts: true,  bodyStyle: 'prose' },
  { kind: 'application', Icon: HeartHandshake, takesReference: false, takesPrompts: true,  bodyStyle: 'aside' },
  { kind: 'practice',    Icon: Footprints,     takesReference: false, takesPrompts: true,  bodyStyle: 'prose' },
  { kind: 'prayer',      Icon: HandHeart,      takesReference: false, takesPrompts: false, bodyStyle: 'prose' },
  { kind: 'review',      Icon: History,        takesReference: true,  takesPrompts: true,  bodyStyle: 'prose' },
  { kind: 'memory',      Icon: Brain,          takesReference: false, takesPrompts: false, bodyStyle: 'verse' },
]

const BY_KIND = new Map(STEP_KINDS.map((spec) => [spec.kind, spec]))

/**
 * Unknown kinds are possible in principle — content written by a newer client
 * than this one — so fall back to something renderable instead of crashing.
 */
export function stepKind(kind: GuidedStepKind): StepKindSpec {
  return BY_KIND.get(kind) ?? {
    kind,
    Icon: BookOpen,
    takesReference: true,
    takesPrompts: true,
    bodyStyle: 'prose',
  }
}
