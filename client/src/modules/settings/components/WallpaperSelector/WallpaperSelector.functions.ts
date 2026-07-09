import type { CSSProperties } from 'react'

import type { Wallpaper } from '@/core/stores/wallpaper'

export function getWallpaperPreviewStyle(wallpaper: Wallpaper): CSSProperties {
  return {
    background: wallpaper.previewBackground,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  }
}

export function getWallpaperPreviewUrl(wallpaper: Wallpaper) {
  const match = /^url\(["']?(.*?)["']?\)$/.exec(wallpaper.previewBackground)

  return match?.[1]
}

export function getWallpaperBackgroundUrl(wallpaper: Wallpaper) {
  const match = /^url\(["']?(.*?)["']?\)$/.exec(wallpaper.background)

  return match?.[1]
}
