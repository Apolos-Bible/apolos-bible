import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BookMarked,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  GraduationCap,
  NotebookPen,
  Search,
  Settings,
  Store,
  UserRound,
} from 'lucide-react'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore, type Panel } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'

type HubItem = {
  icon: typeof Store
  label: string
  description: string
  onClick: () => void
  accent?: boolean
}

export function MobileHubView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hub = useUIStore((state) => state.mobileHub)
  const closeHub = useUIStore((state) => state.closeMobileHub)
  const openPanel = useUIStore((state) => state.openPanel)
  const openSearch = useUIStore((state) => state.openMobileSearch)
  const openAuth = useUIStore((state) => state.openAuthModal)
  const user = useAuthStore((state) => state.user)

  if (!hub) return null

  const requireUser = (run: () => void) => {
    if (!user) {
      closeHub()
      openAuth()
      return
    }
    run()
  }

  const go = (path: string) => {
    closeHub()
    navigate(path)
  }

  const showPanel = (panel: Panel) => requireUser(() => {
    closeHub()
    openPanel(panel)
  })

  const exploreItems: HubItem[] = [
    {
      icon: Store,
      label: t('nav.marketplace'),
      description: t('market.pageSubtitle'),
      onClick: () => requireUser(() => go(paths.marketplace())),
      accent: true,
    },
    {
      icon: Gamepad2,
      label: t('nav.games'),
      description: t('games.subtitle', 'Aprende y juega con otras personas.'),
      onClick: () => requireUser(() => go(paths.games())),
    },
    {
      icon: GraduationCap,
      label: t('path.title'),
      description: t('path.subtitle', 'Tus rutas y estudios bíblicos publicados.'),
      onClick: () => requireUser(() => go(paths.myPaths())),
    },
  ]

  const youItems: HubItem[] = [
    {
      icon: UserRound,
      label: t('nav.profile'),
      description: t('perfil.title.self'),
      onClick: () => requireUser(() => go(paths.profile())),
      accent: true,
    },
    {
      icon: BookMarked,
      label: t('nav.favorites'),
      description: t('favorites.mobileDescription', 'Tus versículos guardados.'),
      onClick: () => showPanel('favorites'),
    },
    {
      icon: NotebookPen,
      label: t('nav.myNotes'),
      description: t('notes.mobileDescription', 'Consulta y organiza tus notas.'),
      onClick: () => showPanel('my-notes'),
    },
    {
      icon: Settings,
      label: t('settings.title'),
      description: t('settings.mobileDescription', 'Apariencia, Biblia, privacidad y cuenta.'),
      onClick: () => requireUser(() => go(paths.settings())),
    },
    {
      icon: CircleHelp,
      label: 'Ayuda y feedback',
      description: 'Resuelve dudas o cuéntanos un problema.',
      onClick: () => requireUser(() => go(paths.help())),
    },
  ]

  const items = hub === 'explore' ? exploreItems : youItems
  const title = hub === 'explore' ? t('nav.explore', 'Explorar') : t('nav.you', 'Tú')

  return (
    <section className="flex h-full min-h-0 flex-col bg-bg-secondary" aria-label={title}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        {hub === 'you' && user ? (
          <UserAvatar name={user.name} email={user.email} src={user.avatar_url} size="md" className="h-9 w-9" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-text-primary">{title}</h1>
          {hub === 'you' && user ? (
            <p className="truncate text-xs text-text-muted">{user.name}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={openSearch}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          aria-label={t('layout.search')}
        >
          <Search className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        {!user && hub === 'you' ? (
          <button
            type="button"
            onClick={() => { closeHub(); openAuth() }}
            className="mb-4 flex w-full items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 p-4 text-left"
          >
            <span>
              <span className="block text-base font-semibold text-text-primary">{t('auth.signInTitle')}</span>
              <span className="mt-1 block text-sm text-text-secondary">{t('auth.welcomeBack')}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-accent" />
          </button>
        ) : null}

        <div className="grid gap-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="group flex min-h-[76px] w-full items-center gap-4 rounded-2xl border border-border-subtle bg-bg-primary p-4 text-left transition-colors active:bg-bg-tertiary"
              >
                <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.accent ? 'bg-accent/15 text-accent' : 'bg-bg-tertiary text-text-secondary'}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-text-primary">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">{item.description}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-text-muted transition-transform group-active:translate-x-0.5" />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
