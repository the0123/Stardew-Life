import { create } from 'zustand'

export type Tile = {
  type: string
  stage: number
  category: string
  planted_at: string
  last_tended: string
} | null

export interface FarmState {
  grid: Tile[][]
  grid_size: { rows: number; cols: number }
  season: string
  farm_day: number
  xp: { health: number; work: number; learning: number; social: number }
  total_level: number
  gold: number
  buildings: string[]
  inventory: Record<string, number>
}

interface FarmStoreState {
  farm: FarmState | null
  isLoading: boolean
  setFarm: (farm: FarmState) => void
  setLoading: (v: boolean) => void
}

export const useFarmStore = create<FarmStoreState>()(set => ({
  farm: null,
  isLoading: false,
  setFarm: farm => set({ farm }),
  setLoading: isLoading => set({ isLoading }),
}))
