import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Users } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { productApi, type FeedItem } from '@/lib/productApi'
import { paths } from '@/router/paths'

export function FeedRoute() {
  const navigate = useNavigate()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { productApi.feed().then((value) => setItems(value.data)).finally(() => setLoading(false)) }, [])
  const mute = async (item: FeedItem) => { await productApi.mute(item.actor.id); setItems((current) => current.filter((entry) => entry.actor.id !== item.actor.id)) }
  return <AppPageLayout title="Tu círculo"><main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-accent"/><div><h1 className="text-xl font-semibold text-text-primary">Tu círculo</h1><p className="text-xs text-text-muted">Reflexiones compartidas por tus amigos, en orden cronológico.</p></div></div>{loading ? <p role="status" className="mt-8 text-sm text-text-muted">Cargando…</p> : items.length === 0 ? <p className="mt-8 rounded-lg border border-border-subtle bg-bg-secondary p-5 text-sm text-text-muted">Todavía no hay actividad visible. Añade amigos o comparte una reflexión para empezar.</p> : <div className="mt-6 space-y-2">{items.map((item) => <article key={item.id} className="rounded-lg border border-border-subtle bg-bg-secondary p-4"><div className="flex items-start justify-between"><button onClick={() => navigate(paths.userProfile(item.actor.id))} className="text-sm font-semibold text-text-primary">{item.actor.name}</button><button aria-label={`Silenciar a ${item.actor.name}`} title="Silenciar" onClick={() => void mute(item)} className="text-text-muted hover:text-text-primary"><MoreHorizontal className="h-4 w-4"/></button></div><button onClick={() => item.target.book && navigate(paths.bible({ lang: 'es', book: item.target.book, chapter: item.target.chapter || 1, verse: item.target.verse }))} className="mt-2 block w-full text-left text-sm leading-relaxed text-text-secondary">{item.summary}</button><time className="mt-2 block text-2xs text-text-muted">{new Date(item.created_at).toLocaleString()}</time></article>)}</div>}</main></AppPageLayout>
}
