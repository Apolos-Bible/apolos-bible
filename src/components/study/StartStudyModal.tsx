import { useState } from 'react'
import { X, BookOpen, StickyNote } from 'lucide-react'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useUIStore } from '@/lib/store/useUIStore'

interface StartStudyModalProps {
  open: boolean
  onClose: () => void
}

export function StartStudyModal({ open, onClose }: StartStudyModalProps) {
  const start = useStudyStore(s => s.start)
  const [type, setType] = useState<'verse' | 'chapter' | 'free'>('verse')
  const [anchorRef, setAnchorRef] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleStart = async () => {
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if ((type === 'verse' || type === 'chapter') && !anchorRef.trim()) {
      setError('Anchor reference is required for this type')
      return
    }
    setLoading(true)
    try {
      await start({
        type,
        anchor_ref: (type === 'verse' || type === 'chapter') ? anchorRef.trim() : undefined,
        title: title.trim(),
      })
      useUIStore.getState().enterStudyMode()
      onClose()
      setTitle('')
      setAnchorRef('')
      setType('verse')
    } catch (e: any) {
      setError(e?.message || 'Failed to start study')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-surface border border-border rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-md font-semibold text-text-primary">Start a Study Session</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-2">Type</label>
          <div className="flex gap-1.5">
            {[
              { value: 'verse', label: 'Verse', Icon: BookOpen },
              { value: 'chapter', label: 'Chapter', Icon: BookOpen },
              { value: 'free', label: 'Free', Icon: StickyNote },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setType(value as typeof type)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  type === value
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {(type === 'verse' || type === 'chapter') && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Anchor Reference
            </label>
            <input
              type="text"
              value={anchorRef}
              onChange={(e) => setAnchorRef(e.target.value)}
              placeholder="e.g. juan-3-16 or romanos-8"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
            />
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Title <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My study session"
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
