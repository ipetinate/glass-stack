import { Check, Download, LoaderCircle, Star } from 'lucide-react'

import { Button } from '@/core/components/ui/Button'

import { categoryLabels } from '../constants'
import type { ApplicationSummary } from '../types'

type ApplicationCardProps = {
  application: ApplicationSummary
  installing?: boolean
  onOpen: (applicationId: string) => void
  onInstall: (applicationId: string) => void
}

export function ApplicationCard({
  application,
  installing = false,
  onOpen,
  onInstall,
}: ApplicationCardProps) {
  const isInstalled = application.status === 'installed'
  const isInstalling = installing || application.status === 'installing'

  return (
    <article className="flex min-h-44 flex-col rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-sm transition-colors hover:bg-black/30">
      <button
        type="button"
        className="flex min-w-0 flex-1 gap-4 text-left"
        onClick={() => onOpen(application.id)}
      >
        <img
          src={application.iconSrc}
          alt={`${application.name} ícone`}
          className="size-16 shrink-0 rounded-2xl object-cover"
        />
        <span className="min-w-0">
          <span className="block truncate text-lg font-semibold text-white">
            {application.name}
          </span>
          <span className="mt-1 block truncate text-xs text-white/50">
            {application.developer}
          </span>
          <span className="mt-3 line-clamp-2 block text-xs leading-5 text-white/75">
            {application.description}
          </span>
        </span>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-white/70">
          <span className="rounded-full bg-[#00b5f0] px-2 py-1 text-white">
            {categoryLabels[application.category]}
          </span>
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-current text-cyan-300" />
            {application.rating.toFixed(1)}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isInstalled || isInstalling}
          onClick={() => onInstall(application.id)}
          className="min-h-8 shrink-0 rounded-lg border-0 bg-[#00bfff] px-3 text-xs text-white hover:bg-[#00a9df]"
        >
          {isInstalled ? <Check className="size-3.5" /> : isInstalling ? <LoaderCircle className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {isInstalled ? 'Instalado' : isInstalling ? 'Instalando…' : 'Instalar'}
        </Button>
      </div>
    </article>
  )
}

