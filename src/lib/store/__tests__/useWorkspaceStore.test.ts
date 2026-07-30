import { beforeEach, describe, expect, it } from 'vitest'
import {
  createWorkspaceTab,
  findWorkspaceGroup,
  useWorkspaceStore,
  WORKSPACE_STORAGE_KEY,
  workspaceGroups,
  type WorkspaceSplitNode,
  type WorkspaceTab,
} from '../useWorkspaceStore'

const tab = (overrides: Partial<WorkspaceTab> = {}): WorkspaceTab => ({
  id: 'marketplace',
  kind: 'marketplace',
  title: 'Marketplace',
  path: '/marketplace',
  ...overrides,
})

function rootGroupId(): string {
  return workspaceGroups(useWorkspaceStore.getState().layout)[0].id
}

beforeEach(() => {
  localStorage.clear()
  useWorkspaceStore.getState().resetWorkspace()
})

describe('createWorkspaceTab', () => {
  it('keeps Bible navigation in one resource tab across localized chapters', () => {
    expect(createWorkspaceTab('/bible/john/3', '/bible/john/3', 'John 3').id).toBe('bible')
    expect(createWorkspaceTab('/es/bible/juan/4', '/es/bible/juan/4', 'Juan 4').id).toBe('bible')
  })

  it('keeps marketplace details and path editing in section tabs', () => {
    expect(createWorkspaceTab('/marketplace/hope', '/marketplace/hope', 'Hope').id).toBe('marketplace')
    expect(createWorkspaceTab('/mis-rutas/hope/day-1', '/mis-rutas/hope/day-1', 'Hope').id)
      .toBe('paths')
  })

  it('gives profiles and groups stable entity tabs', () => {
    expect(createWorkspaceTab('/u/42', '/u/42', 'Ada').id).toBe('profile:42')
    expect(createWorkspaceTab('/chat/7', '/chat/7', 'Study group').id).toBe('conversation:7')
  })
})

describe('workspace layout tree', () => {
  it('opens and updates a resource in the active editor group', () => {
    const store = useWorkspaceStore.getState()
    const groupId = rootGroupId()
    store.openTab(tab(), groupId)
    store.openTab(tab({ title: 'Hope', path: '/marketplace/hope' }), groupId)

    const state = useWorkspaceStore.getState()
    const group = findWorkspaceGroup(state.layout, groupId)
    expect(group?.tabIds).toEqual(['bible', 'marketplace'])
    expect(group?.activeTabId).toBe('marketplace')
    expect(state.tabs.marketplace).toMatchObject({ title: 'Hope', path: '/marketplace/hope' })
  })

  it('splits a tab into a resizable column and leaves the source group available', () => {
    const store = useWorkspaceStore.getState()
    const sourceId = rootGroupId()
    store.openTab(tab(), sourceId)
    expect(store.splitTab('marketplace', sourceId, sourceId, 'right')).toBe('/marketplace')

    const state = useWorkspaceStore.getState()
    expect(state.layout.type).toBe('split')
    const split = state.layout as WorkspaceSplitNode
    expect(split.direction).toBe('row')
    expect(split.children).toHaveLength(2)
    expect(split.sizes).toEqual([0.5, 0.5])

    const groups = workspaceGroups(split)
    expect(groups[0].tabIds).toEqual(['bible'])
    expect(groups[1].tabIds).toEqual(['marketplace'])
    expect(state.activeGroupId).toBe(groups[1].id)
  })

  it('supports nested rows inside columns', () => {
    const store = useWorkspaceStore.getState()
    const sourceId = rootGroupId()
    store.openTab(tab(), sourceId)
    store.splitTab('marketplace', sourceId, sourceId, 'right')
    const right = workspaceGroups(useWorkspaceStore.getState().layout)[1]

    store.openTab(tab({
      id: 'settings',
      kind: 'settings',
      title: 'Settings',
      path: '/ajustes',
    }), right.id)
    store.splitTab('settings', right.id, right.id, 'bottom')

    const layout = useWorkspaceStore.getState().layout as WorkspaceSplitNode
    expect(layout.direction).toBe('row')
    expect(layout.children[1].type).toBe('split')
    expect((layout.children[1] as WorkspaceSplitNode).direction).toBe('column')
    expect(workspaceGroups(layout)).toHaveLength(3)
  })

  it('limits the workspace to four editor groups', () => {
    const store = useWorkspaceStore.getState()
    const tabsToSplit = [
      tab(),
      tab({
        id: 'settings',
        kind: 'settings',
        title: 'Settings',
        path: '/ajustes',
      }),
      tab({
        id: 'profile:self',
        kind: 'profile',
        title: 'Profile',
        path: '/perfil',
      }),
    ]

    tabsToSplit.forEach((newTab, index) => {
      const activeGroupId = useWorkspaceStore.getState().activeGroupId
      store.openTab(newTab, activeGroupId)
      expect(store.splitGroup(activeGroupId, index % 2 ? 'column' : 'row')).not.toBeNull()
    })

    const stateAtLimit = useWorkspaceStore.getState()
    const groupsAtLimit = workspaceGroups(stateAtLimit.layout)
    expect(groupsAtLimit).toHaveLength(4)
    expect(store.splitGroup(stateAtLimit.activeGroupId, 'row')).toBeNull()
    expect(workspaceGroups(useWorkspaceStore.getState().layout)).toHaveLength(4)

    const source = groupsAtLimit[0]
    const target = groupsAtLimit[groupsAtLimit.length - 1]
    const movingTabId = source.tabIds[0]
    expect(source.tabIds).toHaveLength(1)
    expect(store.splitTab(movingTabId, source.id, target.id, 'left'))
      .toBe(stateAtLimit.tabs[movingTabId].path)

    const stateAfterNetZeroSplit = useWorkspaceStore.getState()
    expect(workspaceGroups(stateAfterNetZeroSplit.layout)).toHaveLength(4)
    expect(findWorkspaceGroup(stateAfterNetZeroSplit.layout, source.id)).toBeNull()
    expect(findWorkspaceGroup(stateAfterNetZeroSplit.layout, target.id)).not.toBeNull()
    expect(findWorkspaceGroup(
      stateAfterNetZeroSplit.layout,
      stateAfterNetZeroSplit.activeGroupId,
    )?.tabIds).toEqual([movingTabId])

    const groupToClose = workspaceGroups(useWorkspaceStore.getState().layout)
      .find((group) => group.id !== useWorkspaceStore.getState().activeGroupId)
    expect(groupToClose).toBeDefined()
    store.closeGroup(groupToClose!.id)
    expect(workspaceGroups(useWorkspaceStore.getState().layout)).toHaveLength(3)

    const activeGroupId = useWorkspaceStore.getState().activeGroupId
    store.openTab(tab({
      id: 'conversation:7',
      kind: 'conversation',
      title: 'Study group',
      path: '/chat/7',
    }), activeGroupId)
    expect(store.splitGroup(useWorkspaceStore.getState().activeGroupId, 'row')).not.toBeNull()
    expect(workspaceGroups(useWorkspaceStore.getState().layout)).toHaveLength(4)
  })

  it('moves the last tab between cells, removes its empty source and keeps the target active', () => {
    const store = useWorkspaceStore.getState()
    const sourceId = rootGroupId()
    store.openTab(tab(), sourceId)
    store.splitTab('marketplace', sourceId, sourceId, 'right')
    const [left, right] = workspaceGroups(useWorkspaceStore.getState().layout)

    expect(store.moveTab('bible', left.id, right.id)).toBe('/bible/genesis/1')
    const state = useWorkspaceStore.getState()
    expect(workspaceGroups(state.layout)).toHaveLength(1)
    expect(findWorkspaceGroup(state.layout, left.id)).toBeNull()
    expect(findWorkspaceGroup(state.layout, right.id)?.tabIds).toEqual(['marketplace', 'bible'])
    expect(findWorkspaceGroup(state.layout, right.id)?.activeTabId).toBe('bible')
    expect(state.activeGroupId).toBe(right.id)
  })

  it('does not split a group when its only tab would leave the source empty', () => {
    const store = useWorkspaceStore.getState()
    const sourceId = rootGroupId()

    expect(store.splitGroup(sourceId, 'row')).toBeNull()
    expect(store.splitTab('bible', sourceId, sourceId, 'bottom')).toBeNull()
    expect(workspaceGroups(useWorkspaceStore.getState().layout)).toHaveLength(1)
  })

  it('reorders tabs in both directions inside a cell', () => {
    const store = useWorkspaceStore.getState()
    const groupId = rootGroupId()
    store.openTab(tab(), groupId)
    store.openTab(tab({
      id: 'settings',
      kind: 'settings',
      title: 'Settings',
      path: '/ajustes',
    }), groupId)

    store.moveTabByOffset(groupId, 'bible', 1)
    expect(findWorkspaceGroup(useWorkspaceStore.getState().layout, groupId)?.tabIds)
      .toEqual(['marketplace', 'bible', 'settings'])

    store.moveTabByOffset(groupId, 'settings', -1)
    expect(findWorkspaceGroup(useWorkspaceStore.getState().layout, groupId)?.tabIds)
      .toEqual(['marketplace', 'settings', 'bible'])
  })

  it('persists resized split proportions', () => {
    const store = useWorkspaceStore.getState()
    const sourceId = rootGroupId()
    store.openTab(tab(), sourceId)
    store.splitTab('marketplace', sourceId, sourceId, 'right')
    const split = useWorkspaceStore.getState().layout as WorkspaceSplitNode

    store.setSplitSizes(split.id, [0.7, 0.3])
    const state = useWorkspaceStore.getState()
    expect((state.layout as WorkspaceSplitNode).sizes).toEqual([0.7, 0.3])
    expect(JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? '{}').layout.sizes)
      .toEqual([0.7, 0.3])
  })

  it('closes an active tab and returns the adjacent route', () => {
    const store = useWorkspaceStore.getState()
    const groupId = rootGroupId()
    store.openTab(tab(), groupId)
    store.openTab(tab({
      id: 'settings',
      kind: 'settings',
      title: 'Settings',
      path: '/ajustes',
    }), groupId)

    expect(store.closeTab(groupId, 'settings')).toBe('/marketplace')
    expect(findWorkspaceGroup(useWorkspaceStore.getState().layout, groupId)?.activeTabId)
      .toBe('marketplace')
  })

  it('closes the last tab in a group and collapses the empty split', () => {
    const store = useWorkspaceStore.getState()
    const sourceId = rootGroupId()
    store.openTab(tab(), sourceId)
    store.splitTab('marketplace', sourceId, sourceId, 'right')
    const [, right] = workspaceGroups(useWorkspaceStore.getState().layout)

    expect(store.closeTab(right.id, 'marketplace')).toBe('/bible/genesis/1')

    const state = useWorkspaceStore.getState()
    expect(state.layout.type).toBe('group')
    expect(workspaceGroups(state.layout)).toHaveLength(1)
    expect(state.activeGroupId).toBe(sourceId)
    expect(state.tabs.marketplace).toBeUndefined()
  })

  it('closes a group, collapses its split and activates a remaining route', () => {
    const store = useWorkspaceStore.getState()
    const sourceId = rootGroupId()
    store.openTab(tab(), sourceId)
    store.splitTab('marketplace', sourceId, sourceId, 'right')
    const [, right] = workspaceGroups(useWorkspaceStore.getState().layout)

    expect(store.closeGroup(right.id)).toBe('/bible/genesis/1')

    const state = useWorkspaceStore.getState()
    expect(state.layout.type).toBe('group')
    expect(state.activeGroupId).toBe(sourceId)
    expect(state.tabs.marketplace).toBeUndefined()
  })
})
