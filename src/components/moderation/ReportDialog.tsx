import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { productApi } from '@/lib/productApi'

export function ReportDialog({ open, onClose, target }: { open: boolean; onClose: () => void; target: { type: 'user' | 'note' | 'message' | 'guided_plan' | 'study'; id: string; subjectUserId?: number } }) {
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(false)
  const submit = async () => { await productApi.report({ type: target.type, id: target.id, subject_user_id: target.subjectUserId, reason, details: details || undefined }); setSent(true) }
  return <Dialog open={open} onClose={onClose} label="Reportar contenido">
    {sent ? <div className="p-4 text-sm text-text-secondary">Gracias. El equipo revisará el reporte sin revelar tu identidad.</div> : <div className="space-y-4 p-4"><label className="block text-xs text-text-muted">Motivo<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded-md border border-border-subtle bg-bg-primary p-2 text-sm text-text-primary"><option value="spam">Spam</option><option value="harassment">Acoso</option><option value="impersonation">Suplantación</option><option value="hate">Odio</option><option value="dangerous">Contenido peligroso</option><option value="sexual_violence">Contenido sexual o violento</option><option value="other">Otro</option></select></label><textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={4} placeholder="Contexto opcional" className="w-full rounded-md border border-border-subtle bg-bg-primary p-2 text-sm text-text-primary"/><div className="flex justify-end gap-2"><button onClick={onClose} className="px-3 py-2 text-sm text-text-muted">Cancelar</button><button onClick={() => void submit()} className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary">Enviar reporte</button></div></div>}
  </Dialog>
}
