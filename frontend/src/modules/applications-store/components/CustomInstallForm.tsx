import { useState } from 'react'

import { Input } from '@/core/components/form'
import { Button } from '@/core/components/ui/Button'

type CustomInstallFormProps = {
  onCancel: () => void
  onSubmit: (options: { port: number; volume: string }) => void
}

export function CustomInstallForm({ onCancel, onSubmit }: CustomInstallFormProps) {
  const [port, setPort] = useState('8096')
  const [volume, setVolume] = useState('/srv/apps/jellyfin')

  return (
    <section className="mt-8 rounded-xl border border-[#8b87f9]/50 bg-[#8b87f9]/10 p-5">
      <h2 className="text-base font-semibold text-white">Instalação customizada</h2>
      <p className="mt-1 text-sm text-white/60">Defina as opções iniciais do aplicativo.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input label="Porta" type="number" value={port} onChange={(event) => setPort(event.target.value)} />
        <Input label="Volume" value={volume} onChange={(event) => setVolume(event.target.value)} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="button" size="sm" onClick={() => onSubmit({ port: Number(port), volume })} className="border-0 bg-[#8b87f9] text-white hover:bg-[#7975ed]">Continuar</Button>
      </div>
    </section>
  )
}

