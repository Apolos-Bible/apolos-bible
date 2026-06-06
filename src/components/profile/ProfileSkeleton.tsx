import { Skeleton } from '@/components/ui/Skeleton'

/** Loading placeholder mirroring the profile layout to avoid layout shift. */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 md:px-8 md:py-8 flex flex-col gap-7">
      {/* Identity */}
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-start md:gap-4">
        <div className="h-20 w-20 md:h-16 md:w-16 rounded-full bg-bg-tertiary animate-pulse shrink-0" />
        <div className="flex-1 w-full max-w-[240px] flex flex-col items-center md:items-start gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
          <div className="mt-3 flex gap-2">
            <div className="h-9 w-28 rounded-md bg-bg-tertiary animate-pulse" />
            <div className="h-9 w-24 rounded-md bg-bg-tertiary animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-border-subtle bg-bg-tertiary/40 animate-pulse" />
        ))}
      </div>

      {/* Lists */}
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s} className="flex flex-col gap-3">
          <Skeleton className="h-2.5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 py-1">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
