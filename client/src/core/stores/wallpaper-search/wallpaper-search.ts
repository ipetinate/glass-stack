import { create } from 'zustand'

type WallpaperSearchState = {
  search: string
  clearSearch: () => void
  setSearch: (search: string) => void
}

export const useWallpaperSearchStore = create<WallpaperSearchState>()((set) => ({
  search: '',
  clearSearch: () => set({ search: '' }),
  setSearch: (search) => set({ search }),
}))
