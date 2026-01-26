import { create } from 'zustand'

export type DebugPhase = 'start' | 'end'

export interface DebugEntry {
  id: string
  timestamp: number
  label: string
  phase: DebugPhase
  data: Record<string, number | string | boolean | null>
}

interface DebugState {
  enabled: boolean
  entries: DebugEntry[]
  setEnabled: (enabled: boolean) => void
  addEntry: (entry: Omit<DebugEntry, 'id'>) => void
  clear: () => void
}

const MAX_ENTRIES = 200

export const useDebugStore = create<DebugState>((set, get) => ({
  enabled: false,
  entries: [],
  setEnabled: (enabled) => set({ enabled }),
  addEntry: (entry) => {
    if (!get().enabled) return
    set((state) => {
      const next: DebugEntry = {
        ...entry,
        id: `${entry.timestamp}-${Math.random().toString(16).slice(2)}`,
      }
      const entries = [...state.entries, next]
      return { entries: entries.slice(-MAX_ENTRIES) }
    })
  },
  clear: () => set({ entries: [] }),
}))
