import { AlertCircle, Check, CloudOff, LoaderCircle } from 'lucide-react'
import { useSyncStore } from '@/lib/store/useSyncStore'

export function SyncIndicator() {
  const { state, pending, error } = useSyncStore()
  if (state === 'idle') return null
  const Icon = state === 'saving' ? LoaderCircle : state === 'saved' ? Check : state === 'error' ? AlertCircle : CloudOff
  const label = state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado' : state === 'error' ? error || 'Error al sincronizar' : pending ? `Sin conexión · ${pending} pendientes` : 'Sin conexión'
  return <div role="status" title={label} className="fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-secondary px-2 py-1 text-xs text-text-muted"><Icon className={`h-3.5 w-3.5 ${state === 'saving' ? 'animate-spin' : ''}`} />{label}</div>
}
