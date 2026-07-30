import { Upload } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'

import type { UnsplashWallpaper } from '@/lib/unsplash'
import {
  type Wallpaper,
  useWallpaperStore,
  wallpaperPresets,
} from '@/core/stores/wallpaper'
import {
  saveUnsplashWallpaper,
  uploadWallpaper,
} from '@/modules/settings/api/preferences'

import { SelectedWallpaperDetails } from './SelectedWallpaperDetails'
import { UnsplashWallpaperSearch } from './UnsplashWallpaperSearch'
import { WallpaperFullscreenPreview } from './WallpaperFullscreenPreview'
import { WallpaperOptionCard } from './WallpaperOptionCard'
import { getWallpaperPreviewStyle } from './WallpaperSelector.functions'

export function WallpaperSelector() {
  const [previewWallpaper, setPreviewWallpaper] = useState<Wallpaper | null>(null)
  const [selectionError, setSelectionError] = useState('')
  const selectedWallpaper = useWallpaperStore(
    (state) => state.selectedWallpaper,
  )
  const setWallpaper = useWallpaperStore((state) => state.setWallpaper)

  const selectUnsplashWallpaper = async (wallpaper: UnsplashWallpaper) => {
    setSelectionError('')
    try {
      const stored = await saveUnsplashWallpaper(wallpaper.id)
      const source = stored.mediaAssetId
        ? `/api/v1/wallpapers/${encodeURIComponent(stored.id)}/media`
        : stored.sourceUrl
      if (!source) throw new Error('Wallpaper source is unavailable.')
      setWallpaper({
        id: stored.id,
        title: stored.title,
        description: stored.description,
        source: 'unsplash',
        background: `url("${source}")`,
        previewBackground: `url("${source}")`,
        authorName: stored.authorName,
        authorUrl: stored.authorUrl,
        downloadLocation: stored.downloadLocation,
      })
    } catch {
      setSelectionError(
        'The wallpaper could not be saved by the GlassStack server.',
      )
    }
  }

  const selectUploadedWallpaper = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectionError('')
    try {
      const stored = await uploadWallpaper(file)
      const source = `/api/v1/wallpapers/${encodeURIComponent(stored.id)}/media`
      setWallpaper({
        id: stored.id,
        title: stored.title,
        description: stored.description,
        source: 'upload',
        background: `url("${source}")`,
        previewBackground: `url("${source}")`,
      })
    } catch {
      setSelectionError(
        'The local wallpaper could not be uploaded to the GlassStack server.',
      )
    } finally {
      event.target.value = ''
    }
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

        <label className="relative flex min-h-64 w-52 cursor-pointer flex-col justify-end overflow-hidden rounded-xl border border-dashed border-black/20 bg-white/30 p-4 transition hover:border-sky-400 dark:border-white/20 dark:bg-white/5">
          <input
            type="file"
            aria-label="Upload wallpaper from computer"
            accept="image/jpeg,image/png,image/gif"
            className="sr-only"
            onChange={selectUploadedWallpaper}
          />
          <Upload
            aria-hidden="true"
            className="absolute left-4 top-4 size-6 text-[#151A21]/50 dark:text-white/50"
          />
          <strong>Computer</strong>
          <span className="mt-1 text-sm text-[#151A21]/55 dark:text-white/50">
            Upload a local image
          </span>
        </label>
      </div>

      <UnsplashWallpaperSearch
        onPreview={setPreviewWallpaper}
        selectedWallpaper={selectedWallpaper}
        onSelect={selectUnsplashWallpaper}
      />

      {selectionError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {selectionError}
        </p>
      )}

      <WallpaperFullscreenPreview
        wallpaper={previewWallpaper}
        onClose={() => setPreviewWallpaper(null)}
      />
    </div>
  )
}
