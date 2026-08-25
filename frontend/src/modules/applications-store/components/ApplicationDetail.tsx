import { ArrowLeft, Check, Download, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'

import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { Button } from '@/core/components/ui/Button'

import type { ApplicationDetail as ApplicationDetailModel } from '../types'
import { ApplicationCategoryTags, ApplicationInfoColumns, Stars } from './ApplicationInfoColumns'
import { ScreenshotCarousel } from './ScreenshotCarousel'

type InstallActionProps = {
  status: ApplicationDetailModel['status']
  isInstalling: boolean
  installProgress?: number
  onInstall: () => void
}

function InstallAction({ status, isInstalling, installProgress, onInstall }: InstallActionProps) {
  const isInstalled = status === 'installed'
  const showProgress = isInstalling

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        type="button"
        size="sm"
        onClick={onInstall}
        disabled={isInstalled || isInstalling}
        aria-live="polite"
        className="min-h-7 justify-center rounded-lg border-0 bg-[#00bfff] px-4 text-xs text-white hover:bg-[#00a9df]"
      >
        {isInstalled ? (
          <Check className="size-3.5" />
        ) : isInstalling ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        {isInstalled ? 'Instalado' : isInstalling ? 'Instalando…' : 'Instalar'}
      </Button>
      {showProgress ? (
        <div role="status" aria-label={`Progresso da instalação: ${installProgress ?? 0}%`} className="w-full min-w-28">
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>Progresso</span>
            <span>{Math.round(installProgress ?? 0)}%</span>
          </div>
          <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#00bfff] transition-all duration-500"
              style={{ width: `${installProgress ?? 0}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

type ApplicationDetailProps = {
  application: ApplicationDetailModel
  onBack: () => void
  onInstall: () => void
  onCustomInstall: () => void
  isInstalling: boolean
  installProgress?: number
}

export function ApplicationDetail({
  application,
  onBack,
  onInstall,
  onCustomInstall,
  isInstalling,
  installProgress,
}: ApplicationDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const isInstalled = application.status === 'installed'
  const actionDisabled = isInstalling || isInstalled

  const handleScroll = () => {
    setScrolled((scrollRef.current?.scrollTop ?? 0) > 160)
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="relative flex h-full min-h-0 flex-col overflow-y-auto pr-2">
      <div className="pointer-events-none sticky top-0 z-20 h-0 overflow-visible">
        {scrolled ? (
          <BackgroundBlur
            as="div"
            className="pointer-events-auto mb-2 flex items-center gap-3 rounded-2xl border-white/10 bg-black/70 px-4 py-2"
          >
            <img src={application.iconSrc} alt="" className="size-10 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{application.name}</span>
            <InstallAction
              status={application.status}
              isInstalling={isInstalling}
              installProgress={installProgress}
              onInstall={onInstall}
            />
          </BackgroundBlur>
        ) : null}
      </div>

      <Button
        type="button"
        size="sm"
        onClick={onBack}
        className="mb-6 w-fit rounded-lg border-0 bg-transparent px-3 text-white hover:bg-white/10 hover:text-cyan-300"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={application.iconSrc}
            alt={`${application.name} ícone`}
            className="size-28 rounded-2xl object-cover"
          />
          <div>
            <h1 className="text-3xl font-semibold text-white">{application.name}</h1>
            <p className="mt-2 text-sm text-white/50">{application.developer}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/75">
              <Stars value={application.rating ?? 0} />
              {application.rating !== undefined ? (
                <span>
                  {application.rating.toFixed(1)}
                  {application.downloads ? ` · ${application.downloads} downloads` : ''}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <section aria-label="Informações adicionais" className="grid gap-2 text-xs text-white/75">
          <div className="flex items-center gap-2">
            <span className="text-white/55">Tipo:</span>
            <span className="rounded-full bg-[#00b5f0] px-2 py-0.5 text-white">{application.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/55">Categorias:</span>
            <ApplicationCategoryTags tags={application.tags} />
          </div>
        </section>

        <div className="flex flex-wrap items-start gap-2">
          <InstallAction
            status={application.status}
            isInstalling={isInstalling}
            installProgress={installProgress}
            onInstall={onInstall}
          />
          <Button
            type="button"
            size="sm"
            onClick={onCustomInstall}
            disabled={actionDisabled}
            className="min-h-7 rounded-lg border-0 bg-[#8b87f9] px-3 text-xs text-white hover:bg-[#7975ed]"
          >
            Instalação customizada
          </Button>
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
    </div>
  )
}
