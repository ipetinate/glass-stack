import { Check, ImagePlus, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

import { Avatar } from '@/core/components/ui/Avatar'

export type AvatarSelection = {
  presetId?: string
  imageUrl?: string
}

const presets = [
  {
    id: 'default',
    src: '/images/onboarding/avatar.png',
    label: 'Default avatar',
  },
  {
    id: 'placeholder',
    src: '/images/user-placeholder.webp',
    label: 'Abstract avatar',
  },
] as const

export function AvatarPicker({
  value,
  onChange,
  showPresets = true,
}: {
  value: AvatarSelection
  onChange: (value: AvatarSelection) => void
  showPresets?: boolean
}) {
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

  const currentImage =
    value.imageUrl ??
    presets.find((preset) => preset.id === value.presetId)?.src

  return (
    <div className="space-y-4">
      <label
        className="group relative mx-auto grid size-52 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/25"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          handleFile(event.dataTransfer.files[0])
        }}
      >
        {source ? (
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedAreaPixels) =>
              setArea(croppedAreaPixels)
            }
            classes={{
              containerClassName: 'rounded-full !overflow-visible',
              cropAreaClassName: 'rounded-full border-2 border-white/85 shadow-[0_0_0_9999px_rgb(7_21_37_/_0.28)]',
            }}
          />
        ) : (
          currentImage ? <img src={currentImage} alt="Avatar" className="size-52 rounded-full object-cover" /> : <span className="grid size-52 place-items-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">GS</span>
        )}
        {!source ? (
          <>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <span className="pointer-events-none absolute inset-1 z-10 grid place-items-center rounded-full bg-black/55 p-3 text-center text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex flex-col items-center gap-1.5">
                <ImagePlus size={20} />
                Clique ou solte a imagem aqui
              </span>
            </span>
          </>
        ) : null}
      </label>

      {source ? (
        <div className="mx-auto flex max-w-xs items-center gap-2 rounded-xl border border-black/10 bg-white/25 px-3 py-2 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/25">
          <div className="relative min-w-0 flex-1 py-2">
            <input
              aria-label="Crop zoom"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="relative z-10 m-0 w-full cursor-pointer appearance-none bg-transparent accent-cyan-300 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-900/20 dark:[&::-webkit-slider-runnable-track]:bg-white/20 [&::-webkit-slider-thumb]:size-0 [&::-webkit-slider-thumb]:appearance-none"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 z-20 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/35 p-1 shadow-lg backdrop-blur-md dark:border-white/30 dark:bg-white/15"
              style={{ left: `${((zoom - 1) / 2) * 100}%` }}
            >
              <img src="/images/logo.png" alt="" className="size-full object-contain" />
            </span>
          </div>
          <button
            type="button"
            aria-label="Cancelar corte"
            className="grid size-9 place-items-center rounded-lg border border-transparent text-current/70 transition-colors hover:border-current/30 hover:bg-white/10 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
            onClick={() => {
              URL.revokeObjectURL(source)
              setSource(null)
              setArea(null)
              setZoom(1)
            }}
          >
            <X aria-hidden="true" size={17} />
          </button>
          <button
            type="button"
            aria-label="Usar imagem"
            className="grid size-9 place-items-center rounded-lg border border-transparent text-current/70 transition-colors hover:border-current/30 hover:bg-white/10 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
            onClick={() => void finishCrop()}
          >
            <Check aria-hidden="true" size={17} />
          </button>
        </div>
      ) : null}

      {showPresets ? (
        <div className="flex justify-center gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={preset.label}
              onClick={() => onChange({ presetId: preset.id })}
              className="rounded-full ring-offset-2 ring-offset-transparent transition hover:ring-2 hover:ring-cyan-300"
            >
              <Avatar size="sm" image={preset.src} />
            </button>
          ))}
        </div>
      ) : null}
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
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    256,
    256,
  )
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
