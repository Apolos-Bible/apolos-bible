import { useNavigate, useRouteError } from 'react-router-dom'
import { paths } from '@/router/paths'

export function NotFound() {
  const navigate = useNavigate()
  const error = useRouteError() as { statusText?: string; message?: string } | null

  return (
    <div className="flex h-screen items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm opacity-70">
          {error?.statusText ?? error?.message ?? "We couldn't find what you were looking for."}
        </p>
        <button
          type="button"
          onClick={() => navigate(paths.root(), { replace: true })}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          Back to reading
        </button>
      </div>
    </div>
  )
}
