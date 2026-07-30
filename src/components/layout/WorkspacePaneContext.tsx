import { createContext, useContext, type ReactNode } from 'react'

type WorkspacePaneContextValue = {
  groupId: string
  tabId: string
  isActive: boolean
  reportTitle: (title: string) => void
}

const WorkspacePaneContext = createContext<WorkspacePaneContextValue | null>(null)

export function WorkspacePaneProvider({
  value,
  children,
}: {
  value: WorkspacePaneContextValue
  children: ReactNode
}) {
  return (
    <WorkspacePaneContext.Provider value={value}>
      {children}
    </WorkspacePaneContext.Provider>
  )
}

export function useWorkspacePane(): WorkspacePaneContextValue | null {
  return useContext(WorkspacePaneContext)
}
