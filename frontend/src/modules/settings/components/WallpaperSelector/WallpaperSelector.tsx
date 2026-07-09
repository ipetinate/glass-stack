import { Upload } from 'lucide-react'
import { useState } from 'react'

import { trackUnsplashDownload, type UnsplashWallpaper } from '@/lib/unsplash'
import {
  type Wallpaper,
  useWallpaperStore,
  wallpaperPresets,
} from '@/core/stores/wallpaper'

import { SelectedWallpaperDetails } from './SelectedWallpaperDetails'
import { UnsplashWallpaperSearch } from './UnsplashWallpaperSearch'
import { WallpaperFullscreenPreview } from './WallpaperFullscreenPreview'
import { WallpaperOptionCard } from './WallpaperOptionCard'
import { getWallpaperPreviewStyle } from './WallpaperSelector.functions'

const localComingSoonWallpaper: Wallpaper = {
  id: 'local-coming-soon',
  title: 'Computer',
  description: 'Coming soon',
  source: 'local-coming-soon',
  background: '#111827',
  previewBackground:
    'linear-gradient(135deg, rgba(148,163,184,0.4), rgba(226,232,240,0.75))',
}

export function WallpaperSelector() {
  const [previewWallpaper, setPreviewWallpaper] = useState<Wallpaper | null>(null)
  const selectedWallpaper = useWallpaperStore(
    (state) => state.selectedWallpaper,
  )
  const setWallpaper = useWallpaperStore((state) => state.setWallpaper)

  const selectUnsplashWallpaper = async (wallpaper: UnsplashWallpaper) => {
    await trackUnsplashDownload(wallpaper.downloadLocation)

    setWallpaper({
      id: wallpaper.id,
      title: wallpaper.description,
      description: `Photo by ${wallpaper.authorName}`,
      source: wallpaper.source,
      background: `url("${wallpaper.wallpaperUrl}")`,
      previewBackground: `url("${wallpaper.previewUrl}")`,
      authorName: wallpaper.authorName,
      authorUrl: wallpaper.authorUrl,
      downloadLocation: wallpaper.downloadLocation,
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap gap-5">
        <div className="min-w-72 flex-1">
          <button
            type="button"
            aria-label="Selected wallpaper preview"
            onClick={() => setPreviewWallpaper(selectedWallpaper)}
            className="aspect-video w-full cursor-pointer rounded-xl border border-black/10 transition-transform hover:scale-[1.005] dark:border-white/10"
            style={getWallpaperPreviewStyle(selectedWallpaper)}
          />
        </div>

        <SelectedWallpaperDetails wallpaper={selectedWallpaper} />
      </div>

      <div className="flex flex-wrap gap-5">
        {wallpaperPresets.map((wallpaper) => (
          <WallpaperOptionCard
            key={wallpaper.id}
            wallpaper={wallpaper}
            selected={selectedWallpaper.id === wallpaper.id}
            onSelect={setWallpaper}
            onPreview={setPreviewWallpaper}
          />
        ))}

        <div className="relative">
          <WallpaperOptionCard
            disabled
            wallpaper={localComingSoonWallpaper}
            selected={false}
            onSelect={() => undefined}
          />
          <Upload
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-4 size-5 text-[#151A21]/50 dark:text-white/50"
          />
        </div>
      </div>

      <UnsplashWallpaperSearch
        onPreview={setPreviewWallpaper}
        selectedWallpaper={selectedWallpaper}
        onSelect={selectUnsplashWallpaper}
      />

      <WallpaperFullscreenPreview
        wallpaper={previewWallpaper}
        onClose={() => setPreviewWallpaper(null)}
      />
    </div>
  )
}
