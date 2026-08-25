import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { AppScreenshot } from '../types'

type ScreenshotCarouselProps = {
  screenshots: AppScreenshot[]
}

export function ScreenshotCarousel({ screenshots }: ScreenshotCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number>()

  const stepSize = () => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.children.length < 2) {
      return scroller?.firstElementChild?.clientWidth ?? 0
    }
    const first = scroller.children[0] as HTMLElement
    const second = scroller.children[1] as HTMLElement
    return second.offsetLeft - first.offsetLeft
  }

  const scrollToIndex = (index: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const bounded = Math.max(0, Math.min(index, screenshots.length - 1))
    scroller.scrollTo({ left: bounded * stepSize(), behavior: 'smooth' })
  }

  useEffect(() => {
    if (lightboxIndex === undefined) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxIndex(undefined)
      if (event.key === 'ArrowRight')
        setLightboxIndex((current) =>
          current === undefined ? current : (current + 1) % screenshots.length,
        )
      if (event.key === 'ArrowLeft')
        setLightboxIndex((current) =>
          current === undefined ? current : (current - 1 + screenshots.length) % screenshots.length,
        )
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxIndex, screenshots.length])

  if (screenshots.length === 0) return null

  return (
    <section aria-label="Capturas de tela" className="flex min-w-0 flex-col gap-3">
      <div className="relative">
        <div
          ref={scrollerRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-xl"
          onScroll={(event) => {
            const scroller = event.currentTarget
            const step = stepSize()
            if (step <= 0) return
            setActiveIndex(Math.round(scroller.scrollLeft / step))
          }}
        >
          {screenshots.map((screenshot, index) => (
            <figure
              key={screenshot.id}
              className="group relative aspect-video w-[calc(50%-8px)] shrink-0 snap-start overflow-hidden rounded-xl bg-black/40"
            >
              <img src={screenshot.src} alt={screenshot.alt} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Expandir captura ${index + 1}`}
                onClick={() => setLightboxIndex(index)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100"
              >
                <Maximize2 className="size-6 text-white" />
              </button>
            </figure>
          ))}
        </div>
        {screenshots.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Captura anterior"
              onClick={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Próxima captura"
              onClick={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex >= screenshots.length - 1}
              className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        ) : null}
      </div>
      {screenshots.length > 1 ? (
        <div role="tablist" aria-label="Navegar entre capturas" className="flex items-center justify-center gap-1.5">
          {screenshots.map((screenshot, index) => (
            <button
              key={screenshot.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Captura ${index + 1} de ${screenshots.length}`}
              onClick={() => scrollToIndex(index)}
              className={
                index === activeIndex
                  ? 'h-1.5 w-6 rounded-full bg-white transition-all'
                  : 'size-1.5 rounded-full bg-white/30 transition-all hover:bg-white/55'
              }
            />
          ))}
        </div>
      ) : null}
      {lightboxIndex !== undefined && screenshots[lightboxIndex] ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Captura expandida"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-10 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxIndex(undefined)
          }}
        >
          <img
            src={screenshots[lightboxIndex].src}
            alt={screenshots[lightboxIndex].alt}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
          <button
            type="button"
            aria-label="Fechar captura expandida"
            onClick={() => setLightboxIndex(undefined)}
            className="absolute top-5 right-5 flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-300"
          >
            <X className="size-5" />
          </button>
          {screenshots.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Imagem anterior"
                onClick={() =>
                  setLightboxIndex((current) =>
                    current === undefined ? current : (current - 1 + screenshots.length) % screenshots.length,
                  )
                }
                className="absolute left-5 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-300"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Próxima imagem"
                onClick={() =>
                  setLightboxIndex((current) =>
                    current === undefined ? current : (current + 1) % screenshots.length,
                  )
                }
                className="absolute right-5 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-300"
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="absolute bottom-6 text-xs text-white/60">
                {lightboxIndex + 1} / {screenshots.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
