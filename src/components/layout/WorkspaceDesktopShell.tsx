import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate, useRoutes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FloatingChatDock } from '@/components/chat/FloatingChatDock'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { cn } from '@/lib/cn'
import { useUIStore } from '@/lib/store/useUIStore'
import {
  canSplitWorkspaceTab,
  createWorkspaceTab,
  findWorkspaceGroup,
  useWorkspaceStore,
  type WorkspaceDropEdge,
  type WorkspaceGroupNode,
  type WorkspaceLayoutNode,
  type WorkspaceSplitNode,
  type WorkspaceTab,
} from '@/lib/store/useWorkspaceStore'
import { getVerseStoreForTab, VerseStoreProvider } from '@/lib/store/useVerseStore'
import { getCompareStoreForTab, CompareStoreProvider } from '@/lib/store/useCompareStore'
import { getCrossRefStoreForTab, CrossRefStoreProvider } from '@/lib/store/useCrossRefStore'
import { getBiblePaneStoreForTab, BiblePaneStoreProvider } from '@/lib/store/useBiblePaneStore'
import { workspaceRoutes } from '@/router/workspaceRoutes'
import { WorkspacePaneProvider } from './WorkspacePaneContext'
import { WorkspaceSidePanel } from './WorkspaceSidePanel'
import { DesktopSidebar } from './DesktopSidebar'
import {
  clearWorkspaceTabDrag,
  readWorkspaceTabDrag,
  WorkspaceTabs,
} from './WorkspaceTabs'
import {
  resolveWorkspaceDropTarget,
  type WorkspaceDropTarget,
} from './workspaceDropTarget'

const PANEL_WIDTH_STORAGE_KEY = 'apolos_workspace_panel_width'
const MIN_GROUP_WIDTH = 240
const MIN_GROUP_HEIGHT = 180

function BibleTabStateProvider({ tabId, children }: { tabId: string; children: ReactNode }) {
  return (
    <VerseStoreProvider store={getVerseStoreForTab(tabId)}>
      <CompareStoreProvider store={getCompareStoreForTab(tabId)}>
        <CrossRefStoreProvider store={getCrossRefStoreForTab(tabId)}>
          <BiblePaneStoreProvider store={getBiblePaneStoreForTab(tabId)}>
            {children}
          </BiblePaneStoreProvider>
        </CrossRefStoreProvider>
      </CompareStoreProvider>
    </VerseStoreProvider>
  )
}

function storedPanelWidth(): number {
  const value = Number(localStorage.getItem(PANEL_WIDTH_STORAGE_KEY))
  return Number.isFinite(value) ? Math.min(640, Math.max(280, value)) : 420
}

function fallbackTitleKey(pathname: string) {
  if (pathname.includes('/bible/')) return 'nav.bible' as const
  if (pathname.startsWith('/marketplace')) return 'market.title' as const
  if (pathname.startsWith('/ajustes')) return 'settings.title' as const
  if (pathname.startsWith('/perfil')) return 'perfil.title.self' as const
  if (pathname.startsWith('/u/')) return 'perfil.title.loading' as const
  if (pathname.startsWith('/chat/')) return 'chat.groupChat' as const
  if (pathname.startsWith('/mis-rutas')) return 'path.title' as const
  return 'workspace.untitled' as const
}

export function WorkspaceDesktopShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const layout = useWorkspaceStore((state) => state.layout)
  const activeGroupId = useWorkspaceStore((state) => state.activeGroupId)
  const tabs = useWorkspaceStore((state) => state.tabs)
  const openTab = useWorkspaceStore((state) => state.openTab)
  const updateTab = useWorkspaceStore((state) => state.updateTab)
  const activePanel = useUIStore((state) => state.activePanel)
  const [panelWidth, setPanelWidth] = useState(storedPanelWidth)
  const [resizingPanel, setResizingPanel] = useState(false)
  const fullPath = `${location.pathname}${location.search}${location.hash}`
  const activeGroup = findWorkspaceGroup(layout, activeGroupId)
  const activeTab = activeGroup?.activeTabId ? tabs[activeGroup.activeTabId] : undefined

  useLayoutEffect(() => {
    const state = useWorkspaceStore.getState()
    const activeGroup = findWorkspaceGroup(state.layout, state.activeGroupId)
    const activeTab = activeGroup?.activeTabId ? state.tabs[activeGroup.activeTabId] : undefined
    const routeTab = createWorkspaceTab(
      location.pathname,
      fullPath,
      t(fallbackTitleKey(location.pathname)),
    )
    // Route changes belong to the focused tab when it represents the same
    // destination kind. This preserves explicit "new window" identities for
    // Bible, marketplace, profile, settings and panel tabs.
    if (activeTab?.kind === routeTab.kind) {
      if (activeTab.path !== fullPath) updateTab(activeTab.id, { path: fullPath })
      return
    }
    openTab(
      routeTab,
      useWorkspaceStore.getState().activeGroupId,
    )
  }, [fullPath, location.pathname, openTab, t, updateTab])

  const beginPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = panelWidth
    setResizingPanel(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const move = (moveEvent: PointerEvent) => {
      setPanelWidth(Math.min(640, Math.max(280, startWidth + moveEvent.clientX - startX)))
    }
    const finish = (upEvent: PointerEvent) => {
      const width = Math.min(640, Math.max(280, startWidth + upEvent.clientX - startX))
      setPanelWidth(width)
      localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width))
      setResizingPanel(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }

  return (
    <BibleTabStateProvider tabId={activeTab?.kind === 'bible' ? activeTab.id : 'workspace-global'}>
      <div className="app-viewport flex w-full overflow-hidden bg-bg-primary">
      <DesktopSidebar>
        <Sidebar />
      </DesktopSidebar>

      <aside
        className={cn(
          'h-full shrink-0 overflow-hidden bg-bg-secondary',
          !resizingPanel && 'transition-[width,opacity] duration-150',
          activePanel ? 'border-r border-border-subtle opacity-100' : 'w-0 opacity-0',
        )}
        style={activePanel ? { width: panelWidth } : undefined}
        data-region={activePanel ? 'left-panel' : undefined}
        aria-label={t('a11y.regionLeftPanel')}
        inert={activePanel ? undefined : ''}
      >
        <div className="h-full" style={{ width: panelWidth }}>
          <WorkspaceSidePanel panel={activePanel} />
        </div>
      </aside>

      {activePanel && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t('workspace.resizePanel')}
          tabIndex={0}
          onPointerDown={beginPanelResize}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            const next = Math.min(640, Math.max(280, panelWidth + (event.key === 'ArrowLeft' ? -16 : 16)))
            setPanelWidth(next)
            localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(next))
          }}
          className="group relative z-20 w-1 shrink-0 cursor-col-resize bg-border-subtle outline-none hover:bg-accent/40 focus-visible:bg-accent"
        >
          <span className="absolute inset-y-0 -left-1 -right-1" aria-hidden />
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-hidden">
        <WorkspaceLayoutView node={layout} />
      </main>

      <FloatingChatDock rightPanelOpen={false} />
      </div>
    </BibleTabStateProvider>
  )
}

function WorkspaceLayoutView({ node }: { node: WorkspaceLayoutNode }) {
  if (node.type === 'group') return <WorkspaceGroupView group={node} />
  return <WorkspaceSplitView split={node} />
}

function WorkspaceSplitView({ split }: { split: WorkspaceSplitNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const template = split.children
    .flatMap((_, index) => [
      `${split.sizes[index] ?? 1 / split.children.length}fr`,
      ...(index < split.children.length - 1 ? ['4px'] : []),
    ])
    .join(' ')
  const style: CSSProperties = split.direction === 'row'
    ? { gridTemplateColumns: template, gridTemplateRows: 'minmax(0, 1fr)' }
    : { gridTemplateRows: template, gridTemplateColumns: 'minmax(0, 1fr)' }

  return (
    <div ref={containerRef} className="grid h-full min-h-0 min-w-0 overflow-hidden" style={style}>
      {split.children.map((child, index) => (
        <Fragment key={child.id}>
          <div className="min-h-0 min-w-0 overflow-hidden">
            <WorkspaceLayoutView node={child} />
          </div>
          {index < split.children.length - 1 && (
            <WorkspaceSplitHandle
              split={split}
              index={index}
              containerRef={containerRef}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

function WorkspaceSplitHandle({
  split,
  index,
  containerRef,
}: {
  split: WorkspaceSplitNode
  index: number
  containerRef: RefObject<HTMLDivElement>
}) {
  const { t } = useTranslation()
  const setSplitSizes = useWorkspaceStore((state) => state.setSplitSizes)
  const horizontal = split.direction === 'row'

  const resize = useCallback((delta: number) => {
    const total = split.sizes[index] + split.sizes[index + 1]
    const min = Math.min(total / 2, 0.08)
    const nextA = Math.min(total - min, Math.max(min, split.sizes[index] + delta))
    const sizes = [...split.sizes]
    sizes[index] = nextA
    sizes[index + 1] = total - nextA
    setSplitSizes(split.id, sizes)
  }, [index, setSplitSizes, split.id, split.sizes])

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const containerSize = horizontal ? rect.width : rect.height
    const startPosition = horizontal ? event.clientX : event.clientY
    const startSizes = [...split.sizes]
    const pairTotal = startSizes[index] + startSizes[index + 1]
    const minPixels = horizontal ? MIN_GROUP_WIDTH : MIN_GROUP_HEIGHT
    const minRatio = Math.min(pairTotal / 2, minPixels / Math.max(containerSize, 1))
    document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const move = (moveEvent: PointerEvent) => {
      const position = horizontal ? moveEvent.clientX : moveEvent.clientY
      const delta = (position - startPosition) / Math.max(containerSize, 1)
      const first = Math.min(
        pairTotal - minRatio,
        Math.max(minRatio, startSizes[index] + delta),
      )
      const sizes = [...startSizes]
      sizes[index] = first
      sizes[index + 1] = pairTotal - first
      setSplitSizes(split.id, sizes)
    }
    const finish = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }

  return (
    <div
      role="separator"
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-label={t('workspace.resizeGroup')}
      aria-valuenow={Math.round(split.sizes[index] * 100)}
      tabIndex={0}
      onPointerDown={beginResize}
      onKeyDown={(event) => {
        const decrease = horizontal ? event.key === 'ArrowLeft' : event.key === 'ArrowUp'
        const increase = horizontal ? event.key === 'ArrowRight' : event.key === 'ArrowDown'
        if (!decrease && !increase) return
        event.preventDefault()
        resize(decrease ? -0.02 : 0.02)
      }}
      className={cn(
        'group relative z-20 bg-border-subtle outline-none hover:bg-accent/50 focus-visible:bg-accent',
        horizontal ? 'cursor-col-resize' : 'cursor-row-resize',
      )}
    >
      <span
        className={cn(
          'absolute',
          horizontal ? 'inset-y-0 -left-1 -right-1' : '-bottom-1 -top-1 inset-x-0',
        )}
        aria-hidden
      />
    </div>
  )
}

function WorkspaceGroupView({ group }: { group: WorkspaceGroupNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const tabMap = useWorkspaceStore((state) => state.tabs)
  const layout = useWorkspaceStore((state) => state.layout)
  const activeGroupId = useWorkspaceStore((state) => state.activeGroupId)
  const activateGroup = useWorkspaceStore((state) => state.activateGroup)
  const updateTab = useWorkspaceStore((state) => state.updateTab)
  const moveTab = useWorkspaceStore((state) => state.moveTab)
  const splitTab = useWorkspaceStore((state) => state.splitTab)
  const [dropTarget, setDropTarget] = useState<WorkspaceDropTarget | null>(null)
  const activeTab = group.activeTabId ? tabMap[group.activeTabId] ?? null : null
  const fullPath = `${location.pathname}${location.search}${location.hash}`
  const paneValue = useMemo(() => activeTab ? ({
    groupId: group.id,
    tabId: activeTab.id,
    isActive: group.id === activeGroupId,
    reportTitle: (title: string) => updateTab(activeTab.id, { title }),
  }) : null, [activeTab, activeGroupId, group.id, updateTab])

  const focusGroup = () => {
    activateGroup(group.id)
  }

  const syncGroupUrl = () => {
    if (activeTab && fullPath !== activeTab.path) navigate(activeTab.path)
  }

  const drop = (event: React.DragEvent, edge?: WorkspaceDropEdge) => {
    event.preventDefault()
    event.stopPropagation()
    const data = readWorkspaceTabDrag(event.nativeEvent)
    if (!data) return
    const path = edge
      ? splitTab(data.tabId, data.sourceGroupId, group.id, edge)
      : moveTab(data.tabId, data.sourceGroupId, group.id)
    clearWorkspaceTabDrag()
    setDropTarget(null)
    if (path && path !== fullPath) navigate(path)
  }

  return (
    <section
      className={cn(
        'workspace-editor-group flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-bg-secondary',
        activeGroupId === group.id && 'ring-1 ring-inset ring-accent/25',
      )}
      aria-label={t('workspace.editorGroup')}
      onPointerDownCapture={focusGroup}
      onClickCapture={syncGroupUrl}
    >
      <WorkspaceTabs groupId={group.id} showGroupActions />

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          const target = resolveWorkspaceDropTarget(
            event.currentTarget.getBoundingClientRect(),
            event.clientX,
            event.clientY,
          )
          const data = readWorkspaceTabDrag(event.nativeEvent)
          const canSplit = data
            ? canSplitWorkspaceTab(layout, data.sourceGroupId, group.id)
            : false
          setDropTarget(target === 'center' || canSplit ? target : 'center')
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDropTarget(null)
          }
        }}
        onDrop={(event) => {
          const resolved = resolveWorkspaceDropTarget(
            event.currentTarget.getBoundingClientRect(),
            event.clientX,
            event.clientY,
          )
          const data = readWorkspaceTabDrag(event.nativeEvent)
          const canSplit = data
            ? canSplitWorkspaceTab(layout, data.sourceGroupId, group.id)
            : false
          const target = resolved === 'center' || canSplit ? resolved : 'center'
          drop(event, target === 'center' ? undefined : target)
        }}
      >
        {activeTab && paneValue ? (
          <WorkspacePaneProvider value={paneValue}>
            <WorkspaceRouteContent key={activeTab.id} tab={activeTab} />
          </WorkspacePaneProvider>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm font-medium text-text-secondary">{t('workspace.emptyGroup')}</p>
              <p className="mt-1 text-xs text-text-muted">{t('workspace.emptyGroupHint')}</p>
            </div>
          </div>
        )}

        {dropTarget && (
          <WorkspaceDropPreview target={dropTarget} />
        )}
      </div>
    </section>
  )
}

function WorkspaceRouteContent({ tab }: { tab: WorkspaceTab }) {
  const element = useRoutes(workspaceRoutes, tab.path)
  const content = <div className="h-full min-h-0 overflow-hidden">{element}</div>
  return tab.kind === 'bible'
    ? <BibleTabStateProvider tabId={tab.id}>{content}</BibleTabStateProvider>
    : content
}

function WorkspaceDropPreview({ target }: { target: WorkspaceDropTarget }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30" aria-hidden>
      <div
        className={cn(
          'workspace-drop-preview absolute rounded-sm transition-[inset] duration-75',
          target === 'left' && 'bottom-2 left-2 right-1/2 top-2',
          target === 'right' && 'bottom-2 left-1/2 right-2 top-2',
          target === 'top' && 'bottom-1/2 left-2 right-2 top-2',
          target === 'bottom' && 'bottom-2 left-2 right-2 top-1/2',
          target === 'center' && 'inset-2',
        )}
      />
    </div>
  )
}
