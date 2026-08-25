import { useState } from 'react'

import { Input } from '@/core/components/form'
import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { Button } from '@/core/components/ui/Button'

import type { ApplicationDetail } from '../types'

type CustomInstallFormProps = {
  application: ApplicationDetail
  onCancel: () => void
  onSubmit: (options: { port: number; volume: string }) => void
}

export function CustomInstallForm({ application, onCancel, onSubmit }: CustomInstallFormProps) {
  const defaultPort = application.entrypoint?.portMap ?? ''
  const [port, setPort] = useState(defaultPort)
  const [volume, setVolume] = useState(`/DATA/AppData/${application.id}`)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <BackgroundBlur as="section" className="w-full max-w-xl border-white/15 bg-black/80 p-5">
        <h2 className="text-base font-semibold text-white">Instalação customizada</h2>
        <p className="mt-1 text-sm text-white/60">
          Defina as opções iniciais de {application.name}.
        </p>
        <form
          className="mt-4 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const parsedPort = Number(port)
            if (!Number.isFinite(parsedPort) || parsedPort <= 0 || parsedPort > 65535) return
            if (volume.trim().length === 0) return
            onSubmit({ port: parsedPort, volume: volume.trim() })
          }}
        >
          <Input
            label="Porta"
            type="number"
            min={1}
            max={65535}
            required
            value={port}
            onChange={(event) => setPort(event.target.value)}
          />
          <Input
            label="Volume"
            required
            value={volume}
            onChange={(event) => setVolume(event.target.value)}
          />
          <div className="mt-1 flex justify-end gap-2 md:col-span-2">
            <Button type="button" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="border-0 bg-[#8b87f9] text-white hover:bg-[#7975ed]"
            >
              Continuar
            </Button>
          </div>
        </form>
      </BackgroundBlur>
    </div>
  )
}
