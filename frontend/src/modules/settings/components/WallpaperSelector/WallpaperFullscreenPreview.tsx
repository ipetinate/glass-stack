import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Aperture, Minimize2, X } from 'lucide-react'

import { Portal } from '@/core/components/structure/Portal'
import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import type { Wallpaper } from '@/core/stores/wallpaper'

import {
  getWallpaperBackgroundUrl,
  getWallpaperPreviewStyle,
} from './WallpaperSelector.functions'

type WallpaperFullscreenPreviewProps = {
  wallpaper: Wallpaper | null
  onClose: () => void
}

export function WallpaperFullscreenPreview({
  wallpaper,
  onClose,
}: WallpaperFullscreenPreviewProps) {
  const [isCreditsMinimized, setIsCreditsMinimized] = useState(false)

  useEffect(() => {
    setIsCreditsMinimized(false)
  }, [wallpaper?.id])

  useEffect(() => {
    if (!wallpaper) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, wallpaper])

  if (!wallpaper) return null

  const backgroundUrl = getWallpaperBackgroundUrl(wallpaper)
  const isUnsplashWallpaper = wallpaper.source === 'unsplash'

  return (
    <Portal selector="#wallpaper-preview-root">
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            data-testid="wallpaper-preview-window"
            className="relative h-[calc(100dvh-3rem)] w-[calc(100vw-3rem)] overflow-hidden rounded-3xl border border-white/15 bg-black shadow-none"
            initial={{ scale: 0.985, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.985, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <button
              type="button"
              aria-label="Close wallpaper preview"
              onClick={onClose}
              className="absolute right-6 top-6 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50"
            >
              <X aria-hidden="true" className="size-6" />
            </button>

            {backgroundUrl ? (
              <img
                alt=""
                draggable={false}
                src={backgroundUrl}
                className="pointer-events-none h-full w-full select-none object-cover"
              />
            ) : (
              <div
                className="pointer-events-none h-full w-full select-none"
                style={getWallpaperPreviewStyle(wallpaper)}
              />
            )}

            <AnimatePresence mode="wait">
              {isCreditsMinimized ? (
                <motion.button
                  key="minimized-credits"
                  type="button"
                  aria-label="Show wallpaper credits"
                  onClick={() => setIsCreditsMinimized(false)}
                  className="absolute bottom-6 right-6 flex size-14 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl transition-colors hover:bg-black/50"
                  initial={{ opacity: 0, scale: 0.85, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 12 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <Aperture aria-hidden="true" className="size-6" />
                </motion.button>
              ) : (
                <BackgroundBlur
                  as={motion.div}
                  key="expanded-credits"
                  className="absolute bottom-6 left-1/2 flex w-[min(44rem,calc(100vw-6rem))] -translate-x-1/2 flex-col gap-3 rounded-2xl p-5 text-white dark:text-white"
                  initial={{ opacity: 0, scale: 0.96, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 24 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-white/55">
                        Selected background
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">{wallpaper.title}</h2>
                      <p className="mt-1 text-sm text-white/65">{wallpaper.description}</p>
                    </div>

                    <button
                      type="button"
                      aria-label="Minimize wallpaper credits"
                      onClick={() => setIsCreditsMinimized(true)}
                      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    >
                      <Minimize2 aria-hidden="true" className="size-5" />
                    </button>
                  </div>

                  {isUnsplashWallpaper && (
                    <div className="border-t border-white/10 pt-3 text-sm text-white/70">
                      <span className="mr-2 rounded-full bg-sky-400/20 px-2 py-1 text-xs font-semibold text-sky-100">
                        Unsplash
                      </span>
                      Image courtesy of Unsplash. Rights belong to{' '}
                      {wallpaper.authorUrl ? (
                        <a
                          href={wallpaper.authorUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sky-200 hover:text-sky-100"
                        >
                          {wallpaper.authorName}
                        </a>
                      ) : (
                        <span className="font-semibold">{wallpaper.authorName}</span>
                      )}
                      .
                    </div>
                  )}
                </BackgroundBlur>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  )
}
