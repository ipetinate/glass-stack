import { describe, expect, it } from 'vitest'

import { useWallpaperSearchStore } from './wallpaper-search'

describe('useWallpaperSearchStore', () => {
  it('keeps wallpaper search text in memory', () => {
    useWallpaperSearchStore.getState().setSearch('northern lights')

    expect(useWallpaperSearchStore.getState().search).toBe('northern lights')
  })

  it('clears wallpaper search text when requested', () => {
    useWallpaperSearchStore.getState().setSearch('city lights')
    useWallpaperSearchStore.getState().clearSearch()

    expect(useWallpaperSearchStore.getState().search).toBe('')
  })
})
