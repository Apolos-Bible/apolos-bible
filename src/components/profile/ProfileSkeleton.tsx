import { Skeleton } from '@/components/ui/Skeleton'

/** Loading placeholder mirroring the profile layout to avoid layout shift. */
export function ProfileSkeleton() {
  return (
    <div className="min-h-full bg-bg-secondary">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:px-8 md:py-8">
        <div className="flex flex-col items-center gap-5 border-b border-border-subtle pb-7 sm:flex-row sm:items-start md:gap-6 md:pb-8">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-bg-tertiary md:h-28 md:w-28" />
          <div className="flex w-full max-w-sm flex-1 flex-col items-center gap-2 pt-2 sm:items-start">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="mt-1 h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="mt-2 flex gap-2">
              <div className="h-9 w-28 animate-pulse rounded-full bg-bg-tertiary" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-bg-tertiary" />
            </div>
          </div>
        </div>

        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <aside className="rounded-2xl border border-border-subtle bg-bg-secondary p-5 lg:order-2">
            <Skeleton className="h-2.5 w-24" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[68px] animate-pulse rounded-xl bg-bg-tertiary last:col-span-2"
                />
              ))}
            </div>
          </aside>

          <main className="space-y-5 lg:order-1">
            {Array.from({ length: 2 }).map((_, section) => (
              <div key={section} className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
                <Skeleton className="h-2.5 w-24" />
                <div className="mt-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, row) => (
                    <div key={row} className="flex flex-col gap-2 py-1">
                      <Skeleton className="h-2.5 w-20" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}
