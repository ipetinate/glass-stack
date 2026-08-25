import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

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
    <section aria-label="Aplicativos em destaque" className="relative h-80 shrink-0 overflow-hidden rounded-2xl bg-black/40">
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
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/20" />
      <div className="relative flex h-full items-end justify-between gap-5 p-6">
        <button
          type="button"
          onClick={() => onOpen(activeApplication.id)}
          className="flex max-w-xl items-center gap-4 text-left"
        >
          <img
            src={activeApplication.iconSrc}
            alt={`${activeApplication.name} ícone`}
            className="size-16 rounded-2xl object-cover"
          />
          <span>
            <span className="block text-2xl font-semibold text-white">
              {activeApplication.name}
            </span>
            <span className="mt-1 block text-sm text-white/60">
              {activeApplication.developer}
            </span>
            <span className="mt-3 inline-flex rounded-full bg-[#00b5f0] px-3 py-1 text-xs text-white">
              Aplicativo Docker
            </span>
          </span>
        </button>
        <div className="flex items-center gap-4">
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
              className="size-9 min-h-9 rounded-lg border-white/15 bg-black/25 p-0 text-white"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              aria-label="Próximo destaque"
              onClick={() => goTo(activeIndex + 1)}
              className="size-9 min-h-9 rounded-lg border-white/15 bg-black/25 p-0 text-white"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
