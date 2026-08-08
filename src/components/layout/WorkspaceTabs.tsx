import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Columns2,
  FileText,
  MessageCircle,
  Route,
  Rows2,
  Settings,
  Store,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  createWorkspaceTab,
  findWorkspaceGroup,
  MAX_WORKSPACE_GROUPS,
  useWorkspaceStore,
  workspaceGroups,
  type WorkspaceTabKind,
} from '@/lib/store/useWorkspaceStore'

const TAB_ICONS = {
  bible: BookOpen,
  marketplace: Store,
  profile: UserRound,
  settings: Settings,
  conversation: MessageCircle,
  paths: Route,
  other: FileText,
} satisfies Record<WorkspaceTabKind, typeof BookOpen>

export const WORKSPACE_TAB_DRAG_MIME = 'application/x-apolos-workspace-tab'

export type WorkspaceTabDragData = {
  tabId: string
  sourceGroupId: string
}

let activeWorkspaceTabDrag: WorkspaceTabDragData | null = null

export function clearWorkspaceTabDrag() {
  activeWorkspaceTabDrag = null
}

export function readWorkspaceTabDrag(event: Pick<DragEvent, 'dataTransfer'>): WorkspaceTabDragData | null {
  try {
    const raw = event.dataTransfer?.getData(WORKSPACE_TAB_DRAG_MIME)
      || event.dataTransfer?.getData('text/plain')
    if (!raw) return activeWorkspaceTabDrag
    const parsed = JSON.parse(raw) as Partial<WorkspaceTabDragData>
    return typeof parsed.tabId === 'string' && typeof parsed.sourceGroupId === 'string'
      ? { tabId: parsed.tabId, sourceGroupId: parsed.sourceGroupId }
      : null
  } catch {
    return null
  }
}

type WorkspaceTabsProps = {
  /** Present in the route-owned mobile shell; syncs the browser route to a tab. */
  title?: string
  /** Present in desktop editor groups; renders only that group's tabs. */
  groupId?: string
  showGroupActions?: boolean
}

export function WorkspaceTabs({
  title,
  groupId,
  showGroupActions = false,
}: WorkspaceTabsProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const layout = useWorkspaceStore((state) => state.layout)
  const tabMap = useWorkspaceStore((state) => state.tabs)
  const activeGroupId = useWorkspaceStore((state) => state.activeGroupId)
  const openTab = useWorkspaceStore((state) => state.openTab)
  const activateTab = useWorkspaceStore((state) => state.activateTab)
  const closeTab = useWorkspaceStore((state) => state.closeTab)
  const moveTab = useWorkspaceStore((state) => state.moveTab)
  const moveTabByOffset = useWorkspaceStore((state) => state.moveTabByOffset)
  const splitGroup = useWorkspaceStore((state) => state.splitGroup)
  const closeGroup = useWorkspaceStore((state) => state.closeGroup)
  const resolvedGroupId = groupId ?? activeGroupId
  const group = findWorkspaceGroup(layout, resolvedGroupId)
  const tabs = group?.tabIds.map((id) => tabMap[id]).filter(Boolean) ?? []
  const activeTabId = group?.activeTabId ?? null
  const [dragging, setDragging] = useState<WorkspaceTabDragData | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const fullPath = `${location.pathname}${location.search}${location.hash}`

  useLayoutEffect(() => {
    if (title === undefined) return
    openTab(createWorkspaceTab(
      location.pathname,
      fullPath,
      title.trim() || t('workspace.untitled'),
    ), resolvedGroupId)
  }, [fullPath, location.pathname, openTab, resolvedGroupId, t, title])

  useEffect(() => {
    if (activeTabId) {
      tabButtonRefs.current.get(activeTabId)?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [activeTabId])

  if (!group) return null

  const selectTab = (id: string, path: string) => {
    activateTab(group.id, id)
    if (fullPath !== path) navigate(path)
  }

  const dismissTab = (id: string) => {
    const nextPath = closeTab(group.id, id)
    if (nextPath && nextPath !== fullPath) navigate(nextPath)
  }

  const split = (direction: 'row' | 'column') => {
    const path = splitGroup(group.id, direction)
    if (path && path !== fullPath) navigate(path)
  }

  const groups = workspaceGroups(layout)
  const reachedGroupLimit = groups.length >= MAX_WORKSPACE_GROUPS
  const canSplitGroup = !reachedGroupLimit && group.tabIds.length > 1
  const splitUnavailableLabel = reachedGroupLimit
    ? t('workspace.groupLimit')
    : t('workspace.splitNeedsTabs')
  const tabsOutsideGroup = groups
    .filter((item) => item.id !== group.id)
    .reduce((sum, item) => sum + item.tabIds.length, 0)
  const canCloseGroup = groups.length > 1 && tabsOutsideGroup > 0

  return (
    <div
      className="hidden h-9 shrink-0 items-stretch border-b border-border-subtle bg-bg-primary md:flex"
      role="toolbar"
      aria-label={t('workspace.tabs')}
      data-tour="workspace-tabs"
    >
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {tabs.length === 0 && (
          <span className="flex items-center px-3 text-2xs text-text-muted">
            {t('workspace.emptyGroup')}
          </span>
        )}

        {tabs.map((tab, tabIndex) => {
          const active = tab.id === activeTabId
          const Icon = TAB_ICONS[tab.kind]
          const totalTabs = Object.keys(tabMap).length
          const canClose = totalTabs > 1
          const draggingIndex = dragging?.sourceGroupId === group.id
            ? tabs.findIndex((item) => item.id === dragging.tabId)
            : -1
          const dropAfter = draggingIndex >= 0 && draggingIndex < tabIndex

          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(event) => {
                const data = { tabId: tab.id, sourceGroupId: group.id }
                const serialized = JSON.stringify(data)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData(WORKSPACE_TAB_DRAG_MIME, serialized)
                event.dataTransfer.setData('text/plain', serialized)
                activeWorkspaceTabDrag = data
                setDragging(data)
              }}
              onDragEnd={() => {
                clearWorkspaceTabDrag()
                setDragging(null)
                setDropTargetId(null)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.stopPropagation()
                event.dataTransfer.dropEffect = 'move'
                setDropTargetId(tab.id)
              }}
              onDragLeave={() => {
                if (dropTargetId === tab.id) setDropTargetId(null)
              }}
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const data = readWorkspaceTabDrag(event.nativeEvent)
                if (data) {
                  const path = moveTab(data.tabId, data.sourceGroupId, group.id, tab.id)
                  if (path && path !== fullPath) navigate(path)
                }
                clearWorkspaceTabDrag()
                setDragging(null)
                setDropTargetId(null)
              }}
              onAuxClick={(event) => {
                if (event.button === 1 && canClose) dismissTab(tab.id)
              }}
              className={cn(
                'group relative flex min-w-[132px] max-w-[220px] shrink-0 items-stretch border-r border-border-subtle',
                active ? 'bg-bg-secondary text-text-primary' : 'bg-bg-primary text-text-muted',
                dragging?.tabId === tab.id && 'opacity-50',
                dropTargetId === tab.id && (
                  dropAfter
                    ? 'after:absolute after:inset-y-1 after:right-0 after:z-10 after:w-0.5 after:bg-accent'
                    : 'before:absolute before:inset-y-1 before:left-0 before:z-10 before:w-0.5 before:bg-accent'
                ),
              )}
            >
              {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden />}
              <button
                ref={(node) => {
                  if (node) tabButtonRefs.current.set(tab.id, node)
                  else tabButtonRefs.current.delete(tab.id)
                }}
                type="button"
                data-workspace-tab
                aria-pressed={active}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(tab.id, tab.path)}
                onKeyDown={(event) => {
                  if (!event.altKey || !event.shiftKey) return
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                  event.preventDefault()
                  moveTabByOffset(group.id, tab.id, event.key === 'ArrowLeft' ? -1 : 1)
                  requestAnimationFrame(() => tabButtonRefs.current.get(tab.id)?.focus())
                }}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 px-3 text-left text-xs outline-none transition-colors duration-100',
                  active ? 'text-text-primary' : 'hover:bg-bg-tertiary hover:text-text-secondary',
                  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50',
                )}
                title={tab.title}
              >
                <Icon className={cn('h-3.5 w-3.5 shrink-0', active && 'text-accent')} strokeWidth={1.6} />
                <span className="truncate">{tab.title}</span>
              </button>

              {canClose && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    dismissTab(tab.id)
                  }}
                  aria-label={t('workspace.closeTab', { title: tab.title })}
                  title={t('workspace.closeTab', { title: tab.title })}
                  className={cn(
                    'mr-1.5 self-center rounded p-0.5 text-text-muted outline-none transition-colors duration-100',
                    'hover:bg-bg-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent/50',
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                  )}
                >
                  <X className="h-3 w-3" strokeWidth={1.8} />
                </button>
              )}
            </div>
          )
        })}
        <div className="min-w-2 flex-1 bg-bg-primary" aria-hidden />
      </div>

      {showGroupActions && (
        <div className="flex shrink-0 items-center border-l border-border-subtle bg-bg-primary px-1">
          <button
            type="button"
            onClick={() => split('row')}
            disabled={!group.activeTabId || !canSplitGroup}
            aria-label={canSplitGroup ? t('workspace.splitRight') : splitUnavailableLabel}
            title={canSplitGroup ? t('workspace.splitRight') : splitUnavailableLabel}
            className="rounded p-1 text-text-muted hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30"
          >
            <Columns2 className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => split('column')}
            disabled={!group.activeTabId || !canSplitGroup}
            aria-label={canSplitGroup ? t('workspace.splitDown') : splitUnavailableLabel}
            title={canSplitGroup ? t('workspace.splitDown') : splitUnavailableLabel}
            className="rounded p-1 text-text-muted hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30"
          >
            <Rows2 className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
          {canCloseGroup && (
            <button
              type="button"
              onClick={() => {
                const nextPath = closeGroup(group.id)
                if (nextPath && nextPath !== fullPath) navigate(nextPath)
              }}
              aria-label={t('workspace.closeGroup')}
              title={t('workspace.closeGroup')}
              className="rounded p-1 text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.6} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
