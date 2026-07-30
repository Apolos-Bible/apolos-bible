import { create } from 'zustand'

export type WorkspaceTabKind =
  | 'bible'
  | 'marketplace'
  | 'profile'
  | 'settings'
  | 'conversation'
  | 'paths'
  | 'other'

export type WorkspaceTab = {
  id: string
  kind: WorkspaceTabKind
  title: string
  path: string
}

export type WorkspaceGroupNode = {
  type: 'group'
  id: string
  tabIds: string[]
  activeTabId: string | null
}

export type WorkspaceSplitNode = {
  type: 'split'
  id: string
  direction: 'row' | 'column'
  children: WorkspaceLayoutNode[]
  sizes: number[]
}

export type WorkspaceLayoutNode = WorkspaceGroupNode | WorkspaceSplitNode
export type WorkspaceDropEdge = 'left' | 'right' | 'top' | 'bottom'

type PersistedWorkspace = {
  tabs: Record<string, WorkspaceTab>
  layout: WorkspaceLayoutNode
  activeGroupId: string
}

type WorkspaceStore = PersistedWorkspace & {
  openTab: (tab: WorkspaceTab, preferredGroupId?: string) => void
  updateTab: (id: string, patch: Partial<Pick<WorkspaceTab, 'title' | 'path'>>) => void
  activateTab: (groupId: string, tabId: string) => void
  activateGroup: (groupId: string) => void
  closeTab: (groupId: string, tabId: string) => string | null
  moveTab: (
    tabId: string,
    sourceGroupId: string,
    targetGroupId: string,
    targetTabId?: string,
  ) => string | null
  moveTabByOffset: (groupId: string, tabId: string, offset: -1 | 1) => void
  splitTab: (
    tabId: string,
    sourceGroupId: string,
    targetGroupId: string,
    edge: WorkspaceDropEdge,
  ) => string | null
  splitGroup: (
    groupId: string,
    direction: 'row' | 'column',
    placement?: 'before' | 'after',
  ) => string | null
  closeGroup: (groupId: string) => string | null
  setSplitSizes: (splitId: string, sizes: number[]) => void
  resetWorkspace: () => void
}

export const WORKSPACE_STORAGE_KEY = 'apolos_workspace_layout_v2'
export const MAX_WORKSPACE_GROUPS = 4
const LEGACY_STORAGE_KEY = 'apolos_workspace_tabs_v1'
const MAX_TABS = 20

let idSequence = 0

function createId(prefix: 'group' | 'split'): string {
  idSequence += 1
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}`
}

const DEFAULT_TAB: WorkspaceTab = {
  id: 'bible',
  kind: 'bible',
  title: 'Bible',
  path: '/bible/genesis/1',
}

function createDefaultWorkspace(): PersistedWorkspace {
  const group: WorkspaceGroupNode = {
    type: 'group',
    id: 'group-root',
    tabIds: [DEFAULT_TAB.id],
    activeTabId: DEFAULT_TAB.id,
  }
  return {
    tabs: { [DEFAULT_TAB.id]: DEFAULT_TAB },
    layout: group,
    activeGroupId: group.id,
  }
}

function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  if (!value || typeof value !== 'object') return false
  const tab = value as Partial<WorkspaceTab>
  return (
    typeof tab.id === 'string'
    && tab.id.length > 0
    && typeof tab.title === 'string'
    && tab.title.length > 0
    && typeof tab.path === 'string'
    && tab.path.startsWith('/')
    && !tab.path.startsWith('//')
    && [
      'bible',
      'marketplace',
      'profile',
      'settings',
      'conversation',
      'paths',
      'other',
    ].includes(tab.kind ?? '')
  )
}

function normalizeSizes(sizes: number[], count: number): number[] {
  if (count < 1) return []
  if (sizes.length !== count || sizes.some((size) => !Number.isFinite(size) || size <= 0)) {
    return Array.from({ length: count }, () => 1 / count)
  }
  const total = sizes.reduce((sum, size) => sum + size, 0)
  return sizes.map((size) => size / total)
}

function isLayoutNode(value: unknown): value is WorkspaceLayoutNode {
  if (!value || typeof value !== 'object') return false
  const node = value as Partial<WorkspaceLayoutNode>
  if (node.type === 'group') {
    return (
      typeof node.id === 'string'
      && Array.isArray(node.tabIds)
      && node.tabIds.every((id) => typeof id === 'string')
      && (node.activeTabId === null || typeof node.activeTabId === 'string')
    )
  }
  if (node.type === 'split') {
    return (
      typeof node.id === 'string'
      && (node.direction === 'row' || node.direction === 'column')
      && Array.isArray(node.children)
      && node.children.length >= 2
      && node.children.every(isLayoutNode)
      && Array.isArray(node.sizes)
    )
  }
  return false
}

export function findWorkspaceGroup(
  node: WorkspaceLayoutNode,
  groupId: string,
): WorkspaceGroupNode | null {
  if (node.type === 'group') return node.id === groupId ? node : null
  for (const child of node.children) {
    const found = findWorkspaceGroup(child, groupId)
    if (found) return found
  }
  return null
}

export function workspaceGroups(node: WorkspaceLayoutNode): WorkspaceGroupNode[] {
  if (node.type === 'group') return [node]
  return node.children.flatMap(workspaceGroups)
}

export function canSplitWorkspaceTab(
  layout: WorkspaceLayoutNode,
  sourceGroupId: string,
  targetGroupId: string,
): boolean {
  const source = findWorkspaceGroup(layout, sourceGroupId)
  const target = findWorkspaceGroup(layout, targetGroupId)
  if (!source || !target) return false
  if (sourceGroupId === targetGroupId && source.tabIds.length <= 1) return false

  // Moving the source group's last tab removes that group before the new one
  // is inserted, so this operation has a net group delta of zero.
  const groupDelta = sourceGroupId !== targetGroupId && source.tabIds.length === 1 ? 0 : 1
  return workspaceGroups(layout).length + groupDelta <= MAX_WORKSPACE_GROUPS
}

function findGroupContainingTab(
  node: WorkspaceLayoutNode,
  tabId: string,
): WorkspaceGroupNode | null {
  return workspaceGroups(node).find((group) => group.tabIds.includes(tabId)) ?? null
}

function updateGroup(
  node: WorkspaceLayoutNode,
  groupId: string,
  update: (group: WorkspaceGroupNode) => WorkspaceGroupNode,
): WorkspaceLayoutNode {
  if (node.type === 'group') return node.id === groupId ? update(node) : node
  return {
    ...node,
    children: node.children.map((child) => updateGroup(child, groupId, update)),
  }
}

function updateSplit(
  node: WorkspaceLayoutNode,
  splitId: string,
  update: (split: WorkspaceSplitNode) => WorkspaceSplitNode,
): WorkspaceLayoutNode {
  if (node.type === 'group') return node
  if (node.id === splitId) return update(node)
  return {
    ...node,
    children: node.children.map((child) => updateSplit(child, splitId, update)),
  }
}

function replaceGroupWithSplit(
  node: WorkspaceLayoutNode,
  groupId: string,
  newGroup: WorkspaceGroupNode,
  edge: WorkspaceDropEdge,
): WorkspaceLayoutNode {
  if (node.type === 'group') {
    if (node.id !== groupId) return node
    const before = edge === 'left' || edge === 'top'
    const children = before ? [newGroup, node] : [node, newGroup]
    return {
      type: 'split',
      id: createId('split'),
      direction: edge === 'left' || edge === 'right' ? 'row' : 'column',
      children,
      sizes: [0.5, 0.5],
    }
  }
  return {
    ...node,
    children: node.children.map((child) => replaceGroupWithSplit(child, groupId, newGroup, edge)),
  }
}

function removeGroup(
  node: WorkspaceLayoutNode,
  groupId: string,
): WorkspaceLayoutNode | null {
  if (node.type === 'group') return node.id === groupId ? null : node

  const remaining = node.children
    .map((child, index) => ({
      child: removeGroup(child, groupId),
      size: node.sizes[index],
    }))
    .filter(
      (item): item is { child: WorkspaceLayoutNode; size: number } =>
        item.child !== null,
    )
  const children = remaining.map((item) => item.child)

  if (children.length === 0) return null
  if (children.length === 1) return children[0]

  return {
    ...node,
    children,
    sizes: normalizeSizes(remaining.map((item) => item.size), children.length),
  }
}

function compactEmptyGroups(node: WorkspaceLayoutNode): WorkspaceLayoutNode | null {
  if (node.type === 'group') return node.tabIds.length > 0 ? node : null

  const remaining = node.children
    .map((child, index) => ({
      child: compactEmptyGroups(child),
      size: node.sizes[index],
    }))
    .filter(
      (item): item is { child: WorkspaceLayoutNode; size: number } =>
        item.child !== null,
    )
  const children = remaining.map((item) => item.child)

  if (children.length === 0) return null
  if (children.length === 1) return children[0]

  return {
    ...node,
    children,
    sizes: normalizeSizes(remaining.map((item) => item.size), children.length),
  }
}

function sanitizeWorkspace(value: unknown): PersistedWorkspace | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<PersistedWorkspace>
  if (!isLayoutNode(parsed.layout) || !parsed.tabs || typeof parsed.tabs !== 'object') return null

  const tabs = Object.fromEntries(
    Object.entries(parsed.tabs)
      .filter((entry): entry is [string, WorkspaceTab] => isWorkspaceTab(entry[1]))
      .slice(-MAX_TABS),
  )
  const tabIds = new Set(Object.keys(tabs))
  if (tabIds.size === 0) return null

  const sanitizeNode = (node: WorkspaceLayoutNode): WorkspaceLayoutNode => {
    if (node.type === 'group') {
      const ids = node.tabIds.filter((id) => tabIds.has(id))
      return {
        ...node,
        tabIds: ids,
        activeTabId: ids.includes(node.activeTabId ?? '')
          ? node.activeTabId
          : ids[0] ?? null,
      }
    }
    return {
      ...node,
      children: node.children.map(sanitizeNode),
      sizes: normalizeSizes(node.sizes, node.children.length),
    }
  }

  const layout = compactEmptyGroups(sanitizeNode(parsed.layout))
  if (!layout) return null
  const groups = workspaceGroups(layout)
  const activeGroupId = groups.some((group) => group.id === parsed.activeGroupId)
    ? parsed.activeGroupId as string
    : groups[0]?.id
  if (!activeGroupId) return null

  return { tabs, layout, activeGroupId }
}

function migrateLegacyWorkspace(): PersistedWorkspace | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tabs?: unknown[]; activeTabId?: string }
    const legacyTabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.filter(isWorkspaceTab).slice(-MAX_TABS)
      : []
    if (legacyTabs.length === 0) return null

    const tabs = Object.fromEntries(legacyTabs.map((tab) => [tab.id, tab]))
    const activeTabId = legacyTabs.some((tab) => tab.id === parsed.activeTabId)
      ? parsed.activeTabId as string
      : legacyTabs[legacyTabs.length - 1].id
    const group: WorkspaceGroupNode = {
      type: 'group',
      id: 'group-root',
      tabIds: legacyTabs.map((tab) => tab.id),
      activeTabId,
    }
    return { tabs, layout: group, activeGroupId: group.id }
  } catch {
    return null
  }
}

function loadWorkspace(): PersistedWorkspace {
  if (typeof window === 'undefined') return createDefaultWorkspace()
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (raw) {
      const workspace = sanitizeWorkspace(JSON.parse(raw))
      if (workspace) return workspace
    }
    return migrateLegacyWorkspace() ?? createDefaultWorkspace()
  } catch {
    return createDefaultWorkspace()
  }
}

function persistWorkspace(workspace: PersistedWorkspace) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
  } catch {
    // Privacy-restricted webviews may deny storage. The in-memory workspace
    // remains fully functional for the current session.
  }
}

function persistedSlice(state: PersistedWorkspace): PersistedWorkspace {
  return {
    tabs: state.tabs,
    layout: state.layout,
    activeGroupId: state.activeGroupId,
  }
}

function workspaceTabIdentity(pathname: string): Pick<WorkspaceTab, 'id' | 'kind'> {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] === 'bible' || segments[1] === 'bible') {
    return { id: 'bible', kind: 'bible' }
  }
  if (segments[0] === 'marketplace') {
    return { id: 'marketplace', kind: 'marketplace' }
  }
  if (segments[0] === 'perfil') {
    return { id: 'profile:self', kind: 'profile' }
  }
  if (segments[0] === 'u' && segments[1]) {
    return { id: `profile:${segments[1]}`, kind: 'profile' }
  }
  if (segments[0] === 'ajustes') {
    return { id: 'settings', kind: 'settings' }
  }
  if (segments[0] === 'chat' && segments[1]) {
    return { id: `conversation:${segments[1]}`, kind: 'conversation' }
  }
  if (segments[0] === 'mis-rutas') {
    return { id: 'paths', kind: 'paths' }
  }
  return {
    id: `page:${segments.slice(0, 2).join(':') || 'root'}`,
    kind: 'other',
  }
}

export function createWorkspaceTab(pathname: string, path: string, title: string): WorkspaceTab {
  return {
    ...workspaceTabIdentity(pathname),
    path,
    title,
  }
}

const initialWorkspace = loadWorkspace()

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...initialWorkspace,

  openTab: (tab, preferredGroupId) => {
    if (!isWorkspaceTab(tab)) return

    set((state) => {
      const existingGroup = findGroupContainingTab(state.layout, tab.id)
      const preferred = preferredGroupId
        ? findWorkspaceGroup(state.layout, preferredGroupId)
        : null
      const target = existingGroup
        ?? preferred
        ?? findWorkspaceGroup(state.layout, state.activeGroupId)
        ?? workspaceGroups(state.layout)[0]
      if (!target) return state

      const tabs = { ...state.tabs, [tab.id]: { ...state.tabs[tab.id], ...tab } }
      const layout = updateGroup(state.layout, target.id, (group) => ({
        ...group,
        tabIds: group.tabIds.includes(tab.id)
          ? group.tabIds
          : [...group.tabIds, tab.id].slice(-MAX_TABS),
        activeTabId: tab.id,
      }))
      const next = { tabs, layout, activeGroupId: target.id }
      persistWorkspace(next)
      return next
    })
  },

  updateTab: (id, patch) => {
    set((state) => {
      const current = state.tabs[id]
      if (!current) return state
      if (
        (patch.title === undefined || patch.title === current.title)
        && (patch.path === undefined || patch.path === current.path)
      ) {
        return state
      }
      const tabs = { ...state.tabs, [id]: { ...current, ...patch } }
      const next = { tabs, layout: state.layout, activeGroupId: state.activeGroupId }
      persistWorkspace(next)
      return next
    })
  },

  activateTab: (groupId, tabId) => {
    set((state) => {
      const group = findWorkspaceGroup(state.layout, groupId)
      if (!group?.tabIds.includes(tabId)) return state
      const layout = updateGroup(state.layout, groupId, (item) => ({ ...item, activeTabId: tabId }))
      const next = { tabs: state.tabs, layout, activeGroupId: groupId }
      persistWorkspace(next)
      return next
    })
  },

  activateGroup: (groupId) => {
    if (!findWorkspaceGroup(get().layout, groupId)) return
    set((state) => {
      const next = { tabs: state.tabs, layout: state.layout, activeGroupId: groupId }
      persistWorkspace(next)
      return next
    })
  },

  closeTab: (groupId, tabId) => {
    let nextPath: string | null = null

    set((state) => {
      const group = findWorkspaceGroup(state.layout, groupId)
      if (!group?.tabIds.includes(tabId)) return state
      const totalTabs = workspaceGroups(state.layout).reduce((sum, item) => sum + item.tabIds.length, 0)
      if (totalTabs <= 1) return state

      const index = group.tabIds.indexOf(tabId)
      const ids = group.tabIds.filter((id) => id !== tabId)
      const nextActiveId = group.activeTabId === tabId
        ? ids[Math.min(index, ids.length - 1)] ?? null
        : group.activeTabId
      let activeGroupId = state.activeGroupId
      let layout = updateGroup(state.layout, groupId, (item) => ({
        ...item,
        tabIds: ids,
        activeTabId: nextActiveId,
      }))

      if (ids.length === 0) {
        layout = removeGroup(layout, groupId) ?? layout
      }

      if (state.activeGroupId === groupId) {
        if (group.activeTabId === tabId && nextActiveId) {
          nextPath = state.tabs[nextActiveId]?.path ?? null
        } else if (!findWorkspaceGroup(layout, groupId)) {
          const fallback = workspaceGroups(layout).find((item) => item.activeTabId)
          if (fallback?.activeTabId) {
            activeGroupId = fallback.id
            nextPath = state.tabs[fallback.activeTabId]?.path ?? null
          }
        }
      }

      const tabs = { ...state.tabs }
      delete tabs[tabId]
      const next = { tabs, layout, activeGroupId }
      persistWorkspace(next)
      return next
    })

    return nextPath
  },

  moveTab: (tabId, sourceGroupId, targetGroupId, targetTabId) => {
    let path: string | null = null

    set((state) => {
      const source = findWorkspaceGroup(state.layout, sourceGroupId)
      const target = findWorkspaceGroup(state.layout, targetGroupId)
      const tab = state.tabs[tabId]
      if (!source?.tabIds.includes(tabId) || !target || !tab) return state

      if (sourceGroupId === targetGroupId) {
        if (targetTabId === tabId) {
          path = tab.path
          return state
        }
        const sourceIndex = source.tabIds.indexOf(tabId)
        const originalTargetIndex = targetTabId ? source.tabIds.indexOf(targetTabId) : -1
        const ids = source.tabIds.filter((id) => id !== tabId)
        const targetIndex = targetTabId ? ids.indexOf(targetTabId) : -1
        const insertAt = targetIndex >= 0
          ? targetIndex + (sourceIndex < originalTargetIndex ? 1 : 0)
          : ids.length
        ids.splice(insertAt, 0, tabId)
        const layout = updateGroup(state.layout, sourceGroupId, (group) => ({
          ...group,
          tabIds: ids,
          activeTabId: tabId,
        }))
        const next = { tabs: state.tabs, layout, activeGroupId: sourceGroupId }
        persistWorkspace(next)
        path = tab.path
        return next
      }

      const sourceIndex = source.tabIds.indexOf(tabId)
      const sourceIds = source.tabIds.filter((id) => id !== tabId)
      const sourceActive = source.activeTabId === tabId
        ? sourceIds[Math.min(sourceIndex, sourceIds.length - 1)] ?? null
        : source.activeTabId
      let layout = updateGroup(state.layout, sourceGroupId, (group) => ({
        ...group,
        tabIds: sourceIds,
        activeTabId: sourceActive,
      }))
      layout = updateGroup(layout, targetGroupId, (group) => {
        const ids = group.tabIds.filter((id) => id !== tabId)
        const targetIndex = targetTabId ? ids.indexOf(targetTabId) : -1
        ids.splice(targetIndex >= 0 ? targetIndex : ids.length, 0, tabId)
        return { ...group, tabIds: ids, activeTabId: tabId }
      })
      if (sourceIds.length === 0) {
        layout = removeGroup(layout, sourceGroupId) ?? layout
      }

      const next = { tabs: state.tabs, layout, activeGroupId: targetGroupId }
      persistWorkspace(next)
      path = tab.path
      return next
    })

    return path
  },

  moveTabByOffset: (groupId, tabId, offset) => {
    const state = get()
    const group = findWorkspaceGroup(state.layout, groupId)
    if (!group) return
    const index = group.tabIds.indexOf(tabId)
    const targetId = group.tabIds[index + offset]
    if (!targetId) return
    state.moveTab(tabId, groupId, groupId, targetId)
  },

  splitTab: (tabId, sourceGroupId, targetGroupId, edge) => {
    let path: string | null = null

    set((state) => {
      const source = findWorkspaceGroup(state.layout, sourceGroupId)
      const target = findWorkspaceGroup(state.layout, targetGroupId)
      const tab = state.tabs[tabId]
      if (!source?.tabIds.includes(tabId) || !target || !tab) return state
      if (!canSplitWorkspaceTab(state.layout, sourceGroupId, targetGroupId)) return state

      const sourceIndex = source.tabIds.indexOf(tabId)
      const sourceIds = source.tabIds.filter((id) => id !== tabId)
      const sourceActive = source.activeTabId === tabId
        ? sourceIds[Math.min(sourceIndex, sourceIds.length - 1)] ?? null
        : source.activeTabId
      let layout = updateGroup(state.layout, sourceGroupId, (group) => ({
        ...group,
        tabIds: sourceIds,
        activeTabId: sourceActive,
      }))
      if (sourceGroupId !== targetGroupId && sourceIds.length === 0) {
        layout = removeGroup(layout, sourceGroupId) ?? layout
      }
      const newGroup: WorkspaceGroupNode = {
        type: 'group',
        id: createId('group'),
        tabIds: [tabId],
        activeTabId: tabId,
      }
      layout = replaceGroupWithSplit(layout, targetGroupId, newGroup, edge)

      const next = { tabs: state.tabs, layout, activeGroupId: newGroup.id }
      persistWorkspace(next)
      path = tab.path
      return next
    })

    return path
  },

  splitGroup: (groupId, direction, placement = 'after') => {
    const state = get()
    if (workspaceGroups(state.layout).length >= MAX_WORKSPACE_GROUPS) return null
    const group = findWorkspaceGroup(state.layout, groupId)
    if (!group?.activeTabId || group.tabIds.length <= 1) return null
    const edge: WorkspaceDropEdge = direction === 'row'
      ? placement === 'before' ? 'left' : 'right'
      : placement === 'before' ? 'top' : 'bottom'
    return state.splitTab(group.activeTabId, groupId, groupId, edge)
  },

  closeGroup: (groupId) => {
    let nextPath: string | null = null

    set((state) => {
      const groups = workspaceGroups(state.layout)
      const group = groups.find((item) => item.id === groupId)
      if (!group || groups.length <= 1) return state
      const remainingTabs = groups
        .filter((item) => item.id !== groupId)
        .reduce((sum, item) => sum + item.tabIds.length, 0)
      if (remainingTabs === 0) return state

      const layout = removeGroup(state.layout, groupId)
      if (!layout) return state
      const tabs = { ...state.tabs }
      group.tabIds.forEach((id) => delete tabs[id])
      let activeGroupId = state.activeGroupId
      if (activeGroupId === groupId) {
        const fallback = workspaceGroups(layout).find((item) => item.activeTabId)
          ?? workspaceGroups(layout)[0]
        activeGroupId = fallback.id
        nextPath = fallback.activeTabId ? tabs[fallback.activeTabId]?.path ?? null : null
      }
      const next = { tabs, layout, activeGroupId }
      persistWorkspace(next)
      return next
    })

    return nextPath
  },

  setSplitSizes: (splitId, sizes) => {
    set((state) => {
      const layout = updateSplit(state.layout, splitId, (split) => ({
        ...split,
        sizes: normalizeSizes(sizes, split.children.length),
      }))
      const next = { tabs: state.tabs, layout, activeGroupId: state.activeGroupId }
      persistWorkspace(next)
      return next
    })
  },

  resetWorkspace: () => {
    const next = createDefaultWorkspace()
    persistWorkspace(next)
    set(next)
  },
}))

export function activeWorkspaceTab(state: PersistedWorkspace): WorkspaceTab | null {
  const group = findWorkspaceGroup(state.layout, state.activeGroupId)
  return group?.activeTabId ? state.tabs[group.activeTabId] ?? null : null
}

export function workspaceStateSnapshot(state: WorkspaceStore): PersistedWorkspace {
  return persistedSlice(state)
}
