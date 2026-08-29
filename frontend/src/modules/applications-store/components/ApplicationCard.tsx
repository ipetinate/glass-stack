import { Check, Download, LoaderCircle, Star } from 'lucide-react'

import { Button } from '@/core/components/ui/Button'

import { categoryLabels } from '../constants'
import { useActiveOperation } from '../repositories'
import { isRunningOperation } from '../stores/install-operations'
import type { ApplicationSummary, InstallOperationStatus } from '../types'

type ApplicationCardProps = {
  application: ApplicationSummary
  installing?: boolean
  installProgress?: number
  onOpen: (applicationId: string) => void
  onInstall: (applicationId: string) => void
}

const OPERATION_LABELS: Partial<Record<InstallOperationStatus, string>> = {
  installing: 'Installing…',
  updating: 'Updating…',
  editing: 'Editing…',
  removing: 'Removing…',
}

export function ApplicationCard({
  application,
  installing = false,
  installProgress,
  onOpen,
  onInstall,
}: ApplicationCardProps) {
  const activeOperation = useActiveOperation(application.id)
  const activeRunning =
    activeOperation !== undefined &&
    isRunningOperation(activeOperation.status)
  const isInstalled = application.status === 'installed'
  const isInstalling =
    installing || activeRunning || application.status === 'installing'
  const operationLabel = activeOperation
    ? OPERATION_LABELS[activeOperation.status]
    : undefined
  const progress =
    isInstalling && activeOperation
      ? Math.max(0, Math.min(100, activeOperation.progress))
      : isInstalling && installProgress !== undefined
        ? Math.max(0, Math.min(100, installProgress))
        : undefined

  return (
    <article
      onClick={() => onOpen(application.id)}
      className="flex min-h-44 cursor-pointer flex-col rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-sm transition-colors hover:bg-black/30"
    >
      <div className="flex min-w-0 flex-1 gap-4 text-left">
        <img
          src={application.iconSrc}
          alt={`${application.name} icon`}
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
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-white/70">
          <span className="rounded-md bg-[#00b5f0] px-2 py-1 text-white">
            {categoryLabels[application.category]}
          </span>
          <span className="flex items-center gap-1">
            {application.rating !== undefined ? (
              <>
                <Star className="size-3 fill-current text-[#00bfff]" />
                {application.rating.toFixed(1)}
              </>
            ) : null}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          <Button
            type="button"
            size="sm"
            disabled={isInstalled || isInstalling}
            onClick={(e) => { e.stopPropagation(); onInstall(application.id) }}
            className="min-h-8 rounded-lg border-0 bg-[#00bfff] px-3 text-xs text-white hover:bg-[#00a9df]"
          >
            {isInstalled ? <Check className="size-3.5" /> : isInstalling ? <LoaderCircle className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {isInstalled ? 'Installed' : isInstalling ? (operationLabel ?? 'Installing…') : 'Install'}
          </Button>
          {isInstalling && progress !== undefined ? (
            <div
              role="progressbar"
              aria-label={`Installing ${application.name}`}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1 min-w-16 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-[#00bfff] transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}