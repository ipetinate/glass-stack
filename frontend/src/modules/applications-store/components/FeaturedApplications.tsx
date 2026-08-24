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

  return (
    <section aria-label="Aplicativos em destaque" className="relative shrink-0 overflow-hidden rounded-2xl">
      <img
        src={activeApplication.screenshots[0]?.src}
        alt=""
        className="absolute inset-0 size-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/25" />
      <div className="relative flex min-h-52 items-end justify-between gap-5 p-6">
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            aria-label="Destaque anterior"
            onClick={() => setActiveIndex((activeIndex - 1 + applications.length) % applications.length)}
            className="size-9 min-h-9 rounded-lg border-white/15 bg-black/25 p-0 text-white"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            aria-label="Próximo destaque"
            onClick={() => setActiveIndex((activeIndex + 1) % applications.length)}
            className="size-9 min-h-9 rounded-lg border-white/15 bg-black/25 p-0 text-white"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

