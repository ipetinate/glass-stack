import {
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Settings,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { Button } from '@/core/components/ui/Button'
import { ContextMenu, type ContextMenuItem } from '@/core/components/ui/context-menu'

import type {
  ApplicationDetail as ApplicationDetailModel,
  InstalledApplication,
  InstallOperation,
  InstallOperationStatus,
} from '../types'
import { ApplicationCategoryTags, ApplicationInfoColumns, Stars } from './ApplicationInfoColumns'
import { ScreenshotCarousel } from './ScreenshotCarousel'

const OPERATION_LABELS: Partial<Record<InstallOperationStatus, string>> = {
  installing: 'Installing…',
  updating: 'Updating…',
  editing: 'Editing…',
  removing: 'Removing…',
}

type InstallActionProps = {
  status: ApplicationDetailModel['status']
  busy: boolean
  busyLabel?: string
  installProgress?: number
  onInstall: () => void
}

function InstallAction({
  status,
  busy,
  busyLabel,
  installProgress,
  onInstall,
}: InstallActionProps) {
  const isInstalled = status === 'installed'

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        type="button"
        size="sm"
        onClick={onInstall}
        disabled={isInstalled || busy}
        aria-live="polite"
        className="min-h-7 justify-center rounded-lg border-0 bg-[#00bfff] px-4 text-xs text-white hover:bg-[#00a9df]"
      >
        {isInstalled ? (
          <Check className="size-3.5" />
        ) : busy ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        {isInstalled ? 'Installed' : busy ? (busyLabel ?? 'Installing…') : 'Install'}
      </Button>
      {busy ? (
        <div
          role="progressbar"
          aria-label={`Installation progress: ${Math.round(installProgress ?? 0)}%`}
          aria-valuenow={Math.round(installProgress ?? 0)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 min-w-24 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full bg-[#00bfff] transition-all duration-500"
            style={{ width: `${Math.round(installProgress ?? 0)}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}

type ApplicationDetailProps = {
  application: ApplicationDetailModel
  installedApp?: InstalledApplication
  activeOperation?: InstallOperation
  onBack: () => void
  onInstall: () => void
  onCustomInstall: () => void
  onUpdate: () => void
  onConfigure: () => void
  onUninstall: () => void
}

export function ApplicationDetail({
  application,
  installedApp,
  activeOperation,
  onBack,
  onInstall,
  onCustomInstall,
  onUpdate,
  onConfigure,
  onUninstall,
}: ApplicationDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  const isInstalled = installedApp?.status === 'installed'
  const isBusy = activeOperation !== undefined &&
    ['queued', 'installing', 'updating', 'editing', 'removing'].includes(activeOperation.status)
  const busyLabel = activeOperation ? OPERATION_LABELS[activeOperation.status] : undefined
  const installProgress = isBusy ? activeOperation?.progress : undefined
  const manageDisabled = isBusy || installedApp?.status === 'removing'

  const manageItems: ContextMenuItem[] = [
    {
      id: 'update',
      label: 'Update',
      icon: RefreshCw,
      onSelect: onUpdate,
      disabled: manageDisabled,
    },
    {
      id: 'configure',
      label: 'Configure',
      icon: Wrench,
      onSelect: onConfigure,
      disabled: manageDisabled,
    },
    ...(installedApp?.accessUrl
      ? [
          {
            id: 'open-url',
            label: 'Open URL',
            icon: ExternalLink,
            onSelect: () => {
              window.open(installedApp.accessUrl, '_blank', 'noopener,noreferrer')
            },
          },
        ]
      : []),
  ]

  const handleScroll = () => {
    setScrolled((scrollRef.current?.scrollTop ?? 0) > 160)
  }

  const openManageMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setMenuPosition({ x: rect.left, y: rect.bottom + 6 })
    setMenuOpen(true)
  }

  const hideStickyAction =
    !isInstalled ||
    ['installing', 'updating', 'editing', 'removing', 'error'].includes(
      installedApp?.status ?? '',
    )

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="relative flex h-full min-h-0 flex-col overflow-y-auto pr-2">
      <div className="pointer-events-none sticky top-0 z-20 h-0 overflow-visible">
        {scrolled ? (
          <BackgroundBlur
            as="div"
            className="pointer-events-auto mb-2 flex items-center gap-3 rounded-2xl border-white/10 bg-black/70 px-4 py-3"
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onBack}
              className="min-h-8 min-w-8 rounded-lg p-0 text-white/70 hover:text-white"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <img src={application.iconSrc} alt="" className="size-10 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{application.name}</span>
            <InstallAction
              status={application.status}
              busy={isBusy}
              busyLabel={busyLabel}
              installProgress={installProgress}
              onInstall={onInstall}
            />
          </BackgroundBlur>
        ) : null}
      </div>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onBack}
        className="mb-6 w-fit rounded-lg px-3 text-white/70 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={application.iconSrc}
            alt={`${application.name} icon`}
            className="size-28 rounded-2xl object-cover"
          />
          <div>
            <h1 className="text-3xl font-semibold text-white">{application.name}</h1>
            <p className="mt-2 text-sm text-white/50">{application.developer}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/75">
              <Stars value={application.rating ?? 0} size="xs" />
              {application.rating !== undefined ? (
                <span>
                  {application.rating.toFixed(1)}
                  {application.downloads ? ` · ${application.downloads} downloads` : ''}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <section aria-label="Additional information" className="grid gap-2 text-xs text-white/75">
          <div className="flex items-center gap-2">
            <span className="text-white/55">Type:</span>
            <span className="rounded-full bg-[#00b5f0] px-2 py-0.5 text-white">{application.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/55">Categories:</span>
            <ApplicationCategoryTags tags={application.tags} />
          </div>
        </section>

        <div className="flex flex-wrap items-start gap-2">
          {hideStickyAction ? (
            <InstallAction
              status={application.status}
              busy={isBusy}
              busyLabel={busyLabel}
              installProgress={installProgress}
              onInstall={onInstall}
            />
          ) : null}
          {!isInstalled && !isBusy ? (
            <Button
              type="button"
              size="sm"
              onClick={onCustomInstall}
              disabled={isInstalled || isBusy}
              className="min-h-7 rounded-lg border-0 bg-[#8b87f9] px-3 text-xs text-white hover:bg-[#7975ed]"
            >
              Custom Install
            </Button>
          ) : null}
          {isInstalled ? (
            <>
              <div className="flex flex-col items-stretch gap-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={onUninstall}
                  disabled={manageDisabled}
                  className="min-h-7 justify-center rounded-lg border-0 bg-rose-500/85 px-3 text-xs text-white hover:bg-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  Uninstall
                </Button>
              </div>
              <button
                type="button"
                aria-label="Manage application"
                onClick={openManageMenu}
                className="flex size-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Settings className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      </header>

      <p className="mt-8 text-base leading-7 text-white/85">{application.longDescription}</p>

      <section className="mt-8 pb-2">
        <h2 className="mb-4 text-base font-semibold text-white">Screenshots</h2>
        <ScreenshotCarousel screenshots={application.screenshots} />
      </section>

      <div className="pb-6 pt-2">
        <ApplicationInfoColumns application={application} />
      </div>

      <ContextMenu
        open={menuOpen}
        x={menuPosition.x}
        y={menuPosition.y}
        items={manageItems}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  )
}