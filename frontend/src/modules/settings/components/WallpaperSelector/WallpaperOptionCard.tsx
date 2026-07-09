import { useState } from 'react'
import { Maximize2 } from 'lucide-react'

import { Skeleton } from '@/core/components/foundation/Skeleton'
import type { Wallpaper } from '@/core/stores/wallpaper'
import { SelectableCard } from '@/modules/settings/components/SelectableCard'

import {
  getWallpaperPreviewStyle,
  getWallpaperPreviewUrl,
} from './WallpaperSelector.functions'

type WallpaperOptionCardProps = {
  disabled?: boolean
  onPreview?: (wallpaper: Wallpaper) => void
  selected?: boolean
  wallpaper: Wallpaper
  onSelect: (wallpaper: Wallpaper) => void
}

export function WallpaperOptionCard({
  disabled = false,
  onPreview,
  selected = false,
  wallpaper,
  onSelect,
}: WallpaperOptionCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const previewUrl = getWallpaperPreviewUrl(wallpaper)

  return (
    <SelectableCard
      ariaLabel={`Select ${wallpaper.title}`}
      className="w-48"
      disabled={disabled}
      selected={selected}
      selectedIndicatorPosition="bottom-right"
      title={wallpaper.title}
      description={wallpaper.description}
      onSelect={() => onSelect(wallpaper)}
    >
      <span className="relative block aspect-video w-full overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
        {previewUrl ? (
          <>
            {!isImageLoaded && (
              <Skeleton
                data-testid="wallpaper-image-skeleton"
                className="absolute inset-0 rounded-none"
              />
            )}
            <img
              alt=""
              loading="lazy"
              src={previewUrl}
              onLoad={() => setIsImageLoaded(true)}
              className={[
                'h-full w-full object-cover transition-opacity',
                isImageLoaded ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            />
          </>
        ) : (
          <span
            aria-hidden="true"
            className="block h-full w-full"
            style={getWallpaperPreviewStyle(wallpaper)}
          />
        )}
        {onPreview && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Preview ${wallpaper.title}`}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onPreview(wallpaper)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return

              event.preventDefault()
              event.stopPropagation()
              onPreview(wallpaper)
            }}
            className="absolute right-2 top-2 z-20 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/45 bg-black/35 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/50 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Maximize2 aria-hidden="true" className="size-4" />
          </span>
        )}
      </span>
    </SelectableCard>
  )
}
