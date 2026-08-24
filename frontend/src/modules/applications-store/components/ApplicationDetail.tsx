import { ArrowLeft, Check, Download, Star } from 'lucide-react'

import { Button } from '@/core/components/ui/Button'

import { categoryLabels } from '../constants'
import type { ApplicationDetail as ApplicationDetailModel } from '../types'

type ApplicationDetailProps = {
  application: ApplicationDetailModel
  onBack: () => void
  onInstall: () => void
  onCustomInstall: () => void
  isInstalling: boolean
}

export function ApplicationDetail({
  application,
  onBack,
  onInstall,
  onCustomInstall,
  isInstalling,
}: ApplicationDetailProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto pr-2">
      <Button
        type="button"
        size="sm"
        onClick={onBack}
        className="mb-8 w-fit min-h-8 rounded-lg border-0 bg-transparent px-0 text-xs text-white hover:bg-transparent hover:text-cyan-300"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>

      <header className="flex items-start justify-between gap-6">
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
              <Star className="size-4 fill-current text-cyan-300" />
              {application.rating.toFixed(1)} · {application.downloads} downloads
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onInstall}
            disabled={isInstalling || application.status === 'installed'}
            className="rounded-lg border-0 bg-[#00bfff] text-white hover:bg-[#00a9df]"
          >
            {application.status === 'installed' ? <Check className="size-4" /> : <Download className="size-4" />}
            {application.status === 'installed' ? 'Instalado' : 'Instalar'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onCustomInstall}
            disabled={isInstalling || application.status === 'installed'}
            className="rounded-lg border-0 bg-[#8b87f9] text-white hover:bg-[#7975ed]"
          >
            Instalação customizada
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <p className="text-base leading-7 text-white/85">{application.longDescription}</p>
        <section className="rounded-xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-base font-semibold text-white">Informações adicionais</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-white/55">Tipo</dt><dd className="text-right text-white">{application.type}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/55">Categorias</dt><dd className="text-right text-white">{categoryLabels[application.category]}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/55">Requisitos</dt><dd className="text-right text-white">{application.requirements.join(', ')}</dd></div>
          </dl>
        </section>
      </div>

      <section className="mt-8 pb-6">
        <h2 className="mb-4 text-base font-semibold text-white">Screenshots</h2>
        <div className="grid grid-cols-2 gap-4">
          {application.screenshots.map((screenshot) => (
            <img key={screenshot.id} src={screenshot.src} alt={screenshot.alt} className="aspect-video w-full rounded-xl object-cover" />
          ))}
        </div>
      </section>
    </div>
  )
}

