import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { Button } from '@/core/components/ui/Button'

import type { ApplicationSummary } from '../types'

type FeaturedApplicationsProps = {
  applications: ApplicationSummary[]
  onOpen: (applicationId: string) => void
}

export function FeaturedApplications({
  applications,
  onOpen,
}: FeaturedApplicationsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeApplication = applications[activeIndex]
  const dragStartX = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  if (!activeApplication) return null

  const primary = activeApplication.screenshots[0]?.src
  const secondary = activeApplication.screenshots[1]?.src ?? primary

  const goTo = (index: number) =>
    setActiveIndex((index + applications.length) % applications.length)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartX.current = e.clientX
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      setDragOffset(e.clientX - dragStartX.current)
    },
    [isDragging],
  )

  const onPointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    const threshold = 80
    if (dragOffset < -threshold) goTo(activeIndex + 1)
    else if (dragOffset > threshold) goTo(activeIndex - 1)
    setDragOffset(0)
  }, [isDragging, dragOffset, activeIndex])

  return (
    <section
      aria-label="Featured apps"
      className="relative size-full h-80 shrink-0 overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        if (isDragging) {
          setIsDragging(false)
          setDragOffset(0)
        }
      }}
      style={{ touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : undefined }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 grid grid-cols-2 transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${dragOffset}px)` }}
      >
        {[primary, secondary].map((source, position) => (
          <img
            key={`${activeApplication.id}-${position}`}
            src={source}
            alt=""
            className="size-full object-cover"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      <BackgroundBlur
        as="button"
        type="button"
        aria-label={`Open ${activeApplication.name}`}
        onClick={() => onOpen(activeApplication.id)}
        className="absolute left-5 top-5 flex h-24 w-[300px] cursor-pointer items-center gap-4 rounded-2xl border-white/15 bg-black/20 p-4 text-left transition-[filter] hover:brightness-110 before:!backdrop-blur-[10px]"
      >
        <img
          src={activeApplication.iconSrc}
          alt={`${activeApplication.name} icon`}
          className="size-16 shrink-0 rounded-2xl object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-white">
            {activeApplication.name}
          </span>
          <span className="block truncate text-[10px] font-semibold text-[#cacaca]">
            {activeApplication.developer}
          </span>
          <span className="mt-0.5 inline-flex h-3.5 items-center rounded-xl bg-[#00b5f0] px-2 text-[10px] font-semibold text-white">
            {activeApplication.type ?? 'Docker Image'}
          </span>
        </span>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/25 text-white pointer-events-none">
          <ArrowUpRight className="size-3.5" />
        </span>
      </BackgroundBlur>
      <div className="absolute right-5 bottom-6 flex items-center gap-4">
        <div role="tablist" aria-label="Featured" className="flex items-center gap-1.5">
          {applications.map((application, index) => (
            <button
              key={application.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={application.name}
              onClick={() => setActiveIndex(index)}
              className={
                index === activeIndex
                  ? 'h-1.5 w-6 rounded-full bg-white transition-all'
                  : 'size-1.5 rounded-full bg-white/35 transition-all hover:bg-white/60'
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            aria-label="Previous featured"
            onClick={() => goTo(activeIndex - 1)}
            className="size-9 min-h-9 rounded-lg border-white/15 bg-black/25 p-0 text-white backdrop-blur-sm"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            aria-label="Next featured"
            onClick={() => goTo(activeIndex + 1)}
            className="size-9 min-h-9 rounded-lg border-white/15 bg-black/25 p-0 text-white backdrop-blur-sm"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
