import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WallpaperSource =
  | 'preset'
  | 'solid'
  | 'gradient'
  | 'unsplash'
  | 'upload'
  | 'local-coming-soon'

export type Wallpaper = {
  id: string
  title: string
  description: string
  source: WallpaperSource
  background: string
  previewBackground: string
  authorName?: string
  authorUrl?: string
  downloadLocation?: string
}

type WallpaperState = {
  selectedWallpaper: Wallpaper
  setWallpaper: (wallpaper: Wallpaper) => void
  applyWallpaper: () => void
}

export const wallpaperPresets: Wallpaper[] = [
  {
    id: 'preset-dark',
    title: 'Night Alps',
    description: 'Default dark scenic wallpaper.',
    source: 'preset',
    background: 'url("/images/wallpapers/default-dark.avif")',
    previewBackground: 'url("/images/wallpapers/default-dark.avif")',
  },
  {
    id: 'preset-light',
    title: 'Soft Horizon',
    description: 'Bright glass-friendly wallpaper.',
    source: 'preset',
    background: 'url("/images/wallpapers/default-light.svg")',
    previewBackground: 'url("/images/wallpapers/default-light.svg")',
  },
  {
    id: 'solid-obsidian',
    title: 'Obsidian',
    description: 'Deep neutral solid background.',
    source: 'solid',
    background: '#0B1017',
    previewBackground: '#0B1017',
  },
  {
    id: 'solid-cloud',
    title: 'Cloud',
    description: 'Clean light solid background.',
    source: 'solid',
    background: '#EDF4FA',
    previewBackground: '#EDF4FA',
  },
  {
    id: 'solid-skyline',
    title: 'Skyline',
    description: 'Cool blue solid background.',
    source: 'solid',
    background: '#8EC5E8',
    previewBackground: '#8EC5E8',
  },
  {
    id: 'solid-blush',
    title: 'Blush',
    description: 'Warm rose solid background.',
    source: 'solid',
    background: '#D9A0A9',
    previewBackground: '#D9A0A9',
  },
  {
    id: 'gradient-aurora-glass',
    title: 'Aurora Glass',
    description: 'Cyan, lilac, and rose glass gradient.',
    source: 'gradient',
    background:
      'radial-gradient(circle at 20% 20%, #A7F3D0 0, transparent 32%), radial-gradient(circle at 75% 18%, #C4B5FD 0, transparent 30%), linear-gradient(135deg, #DFF7FF, #FCE7F3 58%, #DBEAFE)',
    previewBackground:
      'radial-gradient(circle at 20% 20%, #A7F3D0 0, transparent 32%), radial-gradient(circle at 75% 18%, #C4B5FD 0, transparent 30%), linear-gradient(135deg, #DFF7FF, #FCE7F3 58%, #DBEAFE)',
  },
  {
    id: 'gradient-dawn-mist',
    title: 'Dawn Mist',
    description: 'Soft morning gradient for light glass.',
    source: 'gradient',
    background: 'linear-gradient(135deg, #E0F2FE 0%, #FDF2F8 52%, #FEF3C7 100%)',
    previewBackground:
      'linear-gradient(135deg, #E0F2FE 0%, #FDF2F8 52%, #FEF3C7 100%)',
  },
  {
    id: 'gradient-midnight-signal',
    title: 'Midnight Signal',
    description: 'Dark blue gradient with electric accents.',
    source: 'gradient',
    background:
      'radial-gradient(circle at 80% 20%, rgba(14,165,233,0.5), transparent 28%), linear-gradient(135deg, #08111F, #172033 50%, #06111D)',
    previewBackground:
      'radial-gradient(circle at 80% 20%, rgba(14,165,233,0.5), transparent 28%), linear-gradient(135deg, #08111F, #172033 50%, #06111D)',
  },
  {
    id: 'gradient-polar-bloom',
    title: 'Polar Bloom',
    description: 'Icy violet gradient with a calm finish.',
    source: 'gradient',
    background: 'linear-gradient(145deg, #E0F2FE, #DDD6FE 48%, #F5D0FE)',
    previewBackground: 'linear-gradient(145deg, #E0F2FE, #DDD6FE 48%, #F5D0FE)',
  },
]

export const defaultWallpaper = wallpaperPresets[0]

export const applyWallpaperToDocument = (wallpaper: Wallpaper) => {
  const root = document.documentElement

  root.style.setProperty('--app-wallpaper-background', wallpaper.background)

  if (wallpaper.background.startsWith('url(')) {
    root.style.setProperty('--app-wallpaper-url', wallpaper.background)
  } else {
    root.style.removeProperty('--app-wallpaper-url')
  }
}

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set, get) => ({
      selectedWallpaper: defaultWallpaper,
      setWallpaper: (wallpaper) => {
        applyWallpaperToDocument(wallpaper)
        set({ selectedWallpaper: wallpaper })
      },
      applyWallpaper: () => {
        applyWallpaperToDocument(get().selectedWallpaper)
      },
    }),
    {
      name: 'wallpaper',
      partialize: (state) => ({ selectedWallpaper: state.selectedWallpaper }),
      onRehydrateStorage: () => (state) => {
        applyWallpaperToDocument(state?.selectedWallpaper ?? defaultWallpaper)
      },
    },
  ),
)
