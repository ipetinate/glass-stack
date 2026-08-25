import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

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

  if (!activeApplication) return null

  const primary = activeApplication.screenshots[0]?.src
  const secondary = activeApplication.screenshots[1]?.src ?? primary
  const goTo = (index: number) =>
    setActiveIndex((index + applications.length) % applications.length)

  return (
    <section
      aria-label="Aplicativos em destaque"
      className="relative size-full h-80 shrink-0 overflow-hidden"
    >
      <div aria-hidden="true" className="absolute inset-0 grid grid-cols-2">
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
        as="div"
        className="absolute left-5 top-5 flex h-20 w-[271px] items-center gap-3 rounded-2xl border-white/15 bg-black/20 p-2 before:!backdrop-blur-[10px]"
      >
        <img
          src={activeApplication.iconSrc}
          alt={`${activeApplication.name} ícone`}
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
        <button
          type="button"
          aria-label={`Abrir ${activeApplication.name}`}
          onClick={() => onOpen(activeApplication.id)}
          className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/25 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-300"
        >
          <ArrowUpRight className="size-3.5" />
        </button>
      </BackgroundBlur>
      <div className="absolute right-5 bottom-6 flex items-center gap-4">
        <div role="tablist" aria-label="Destaques" className="flex items-center gap-1.5">
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
            aria-label="Destaque anterior"
            onClick={() => goTo(activeIndex - 1)}
            className="size-9 min-h-9 rounded-lg border-white/15 bg-black/25 p-0 text-white backdrop-blur-sm"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            aria-label="Próximo destaque"
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
