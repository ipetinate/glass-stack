import { describe, expect, it } from 'vitest'

import {
  applyWallpaperToDocument,
  defaultWallpaper,
  useWallpaperStore,
  wallpaperPresets,
  type Wallpaper,
} from './wallpaper'

describe('useWallpaperStore', () => {
  it('selects and applies a preset wallpaper', () => {
    const wallpaper = wallpaperPresets.find((preset) => preset.id === 'solid-cloud')!

    useWallpaperStore.getState().setWallpaper(wallpaper)

    expect(useWallpaperStore.getState().selectedWallpaper).toEqual(wallpaper)
    expect(document.documentElement.style.getPropertyValue('--app-wallpaper-background')).toBe(
      wallpaper.background,
    )
  })

  it('applies url wallpapers to both wallpaper variables', () => {
    applyWallpaperToDocument(defaultWallpaper)

    expect(document.documentElement.style.getPropertyValue('--app-wallpaper-background')).toBe(
      defaultWallpaper.background,
    )
    expect(document.documentElement.style.getPropertyValue('--app-wallpaper-url')).toBe(
      defaultWallpaper.background,
    )
  })

  it('selects an unsplash wallpaper', () => {
    const wallpaper: Wallpaper = {
      id: 'unsplash-1',
      title: 'Mountain',
      description: 'Photo by Ada',
      source: 'unsplash',
      background: 'url("https://images.unsplash.com/photo")',
      previewBackground: 'url("https://images.unsplash.com/preview")',
      authorName: 'Ada',
      authorUrl: 'https://unsplash.com/@ada',
      downloadLocation: 'https://api.unsplash.com/photos/1/download',
    }

    useWallpaperStore.getState().setWallpaper(wallpaper)

    expect(useWallpaperStore.getState().selectedWallpaper).toEqual(wallpaper)
  })
})
