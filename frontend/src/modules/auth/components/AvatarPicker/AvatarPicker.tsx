import Cropper, { type Area } from 'react-easy-crop'
import { Check, ImagePlus, X } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Avatar } from '@/core/components/ui/Avatar'
import { Button } from '@/core/components/ui/Button'

export type AvatarSelection = {
  presetId?: string
  imageUrl?: string
}

const presets = [
  { id: 'default', src: '/images/onboarding/avatar.png', label: 'Default avatar' },
  { id: 'placeholder', src: '/images/user-placeholder.webp', label: 'Abstract avatar' },
] as const

export function AvatarPicker({ value, onChange, showPresets = true }: { value: AvatarSelection; onChange: (value: AvatarSelection) => void; showPresets?: boolean }) {
  const [source, setSource] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)

  const finishCrop = useCallback(async () => {
    if (!source || !area) return
    const imageUrl = await cropImage(source, area)
    onChange({ imageUrl })
    URL.revokeObjectURL(source)
    setSource(null)
    setArea(null)
    setZoom(1)
  }, [area, onChange, source])

  const handleFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setSource(URL.createObjectURL(file))
  }

  const currentImage = value.imageUrl ?? presets.find((preset) => preset.id === value.presetId)?.src

  return (
    <div className="space-y-4">
      <label
        className="group relative mx-auto grid size-32 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/25 p-1"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0]) }}
      >
        {source ? (
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedAreaPixels) => setArea(croppedAreaPixels)}
            classes={{ containerClassName: 'rounded-full' }}
          />
        ) : (
          <Avatar size="xl" image={currentImage} initials={!currentImage ? 'GS' : undefined} />
        )}
        {!source ? (
          <>
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
            <span className="pointer-events-none absolute inset-1 z-10 grid place-items-center rounded-full bg-black/55 p-3 text-center text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex flex-col items-center gap-1.5"><ImagePlus size={20} />Clique ou solte a imagem aqui</span>
            </span>
          </>
        ) : null}
      </label>
      {source ? (
        <div className="mx-auto flex max-w-xs items-center gap-3 rounded-xl border border-black/10 bg-white/25 px-3 py-2 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/25">
          <input aria-label="Crop zoom" type="range" min={1} max={3} step={0.1} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-cyan-300" />
          <Button type="button" aria-label="Cancelar corte" size="sm" onClick={() => { URL.revokeObjectURL(source); setSource(null); setArea(null); setZoom(1) }}><X aria-hidden="true" size={17} /></Button>
          <Button type="button" aria-label="Usar imagem" size="sm" onClick={() => void finishCrop()}><Check aria-hidden="true" size={17} /></Button>
        </div>
      ) : null}
      <p className="text-center text-xs text-white/60">Choose an avatar or drop an image here.</p>
      {showPresets ? <div className="flex justify-center gap-3">
        {presets.map((preset) => (
          <button key={preset.id} type="button" aria-label={preset.label} onClick={() => onChange({ presetId: preset.id })} className="rounded-full ring-offset-2 ring-offset-transparent transition hover:ring-2 hover:ring-cyan-300">
            <Avatar size="sm" image={preset.src} />
          </button>
        ))}
      </div> : null}
    </div>
  )
}

async function cropImage(source: string, area: Area) {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 256, 256)
  return canvas.toDataURL('image/webp', 0.86)
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = source
  })
}
