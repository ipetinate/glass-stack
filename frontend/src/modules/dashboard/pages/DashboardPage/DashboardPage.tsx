import { ChartTooltip, RadialDonut } from '@/core/components/charts'
import { SegmentedControl } from '@/core/components/form'
import { cn } from '@/core/functions/class-name'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type PointerEvent } from 'react'

import { fetchStorage } from '@/modules/dashboard/api/queries'
import { InputOutput } from '@/modules/dashboard/components/InputOutput'
import { ProcessingLoad } from '@/modules/dashboard/components/ProcessingLoad'
import { Widget } from '@/modules/dashboard/components/Widget/Widget'

export function DashboardPage() {
  const [storageMode, setStorageMode] = useState<'partitions' | 'disks'>(
    'partitions',
  )
  const [storageTooltip, setStorageTooltip] = useState<{
    label: string
    details: string
    x: number
    y: number
  } | null>(null)
  const storageTooltipLeaveTimeout = useRef<number | null>(null)
  const storageQuery = useQuery({
    queryKey: ['storage'],
    queryFn: ({ signal }) => fetchStorage(signal),
  })
  const storage = storageQuery.data
  const storageItems = (
    storageMode === 'partitions'
      ? (storage?.volumes ?? []).map((volume) => ({
          label: volume.mountpoint,
          value: `${formatBytes(volume.usedBytes)} / ${formatBytes(volume.totalBytes)}`,
          details: `${volume.device} · ${volume.filesystem.toUpperCase()} · ${formatBytes(volume.freeBytes)} free`,
          chartValue: volume.totalBytes
            ? (volume.usedBytes / volume.totalBytes) * 100
            : 0,
          startAngle: 0,
          striped: false,
        }))
      : (storage?.devices ?? []).map((device) => ({
          label: device.name,
          value: device.mountpoints[0] ?? device.kind,
          details: `${device.device} · ${device.kind} · ${device.mountpoints.join(', ') || 'not mounted'}`,
          chartValue: 0,
          startAngle: 0,
          striped: true,
        }))
  ).slice(0, 4)
  return (
    <div className="grid h-full min-h-0 w-full grid-cols-2 grid-rows-[repeat(6,minmax(0,1fr))] gap-8">
      <Widget
        icon="HardDrive"
        title="Storage"
        action={
          <SegmentedControl
            aria-label="Storage view"
            options={[
              { value: 'partitions', label: 'Partitions' },
              { value: 'disks', label: 'Disks' },
            ]}
            size="xs"
            value={storageMode}
            onValueChange={setStorageMode}
          />
        }
        className="relative z-30 col-span-1 col-start-2 row-span-2 row-start-3 min-h-0 overflow-visible"
      >
        <div className="flex h-full min-h-0 w-full flex-col gap-3">
          <div
            className={cn(
              'flex min-h-0 flex-1 items-center gap-5',
              storageItems.length >= 3 ? 'justify-between' : 'justify-start',
            )}
          >
            {storageItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  'group relative flex min-h-0 min-w-0 flex-col items-center gap-3 overflow-visible',
                  storageItems.length >= 3 ? 'flex-1' : 'w-[120px] shrink-0',
                )}
                onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
                  if (storageTooltipLeaveTimeout.current !== null)
                    window.clearTimeout(storageTooltipLeaveTimeout.current)
                  const bounds = event.currentTarget.getBoundingClientRect()
                  setStorageTooltip({
                    label: item.label,
                    details: item.details,
                    x: bounds.left + bounds.width / 2,
                    y: bounds.top - 80,
                  })
                }}
                onPointerLeave={() => {
                  storageTooltipLeaveTimeout.current = window.setTimeout(
                    () => setStorageTooltip(null),
                    220,
                  )
                }}
              >
                <RadialDonut
                  className="aspect-square w-full max-w-[100px] shrink"
                  size={100}
                  gap={10}
                  startAngle={item.startAngle}
                  endAngle={item.startAngle + 360}
                  value={item.chartValue}
                  animation={{ duration: 700, easing: 'cubicOut' }}
                  roundedCaps
                  color="#9bd0ff"
                  striped={item.striped}
                />
                <div className="mx-auto w-full max-w-[120px] min-w-0 text-center">
                  <p
                    className="w-full truncate whitespace-nowrap text-xs font-medium text-white/80"
                    title={item.label}
                  >
                    {item.label}
                  </p>
                  <p
                    className="mt-1 w-full truncate whitespace-nowrap text-sm font-bold text-white"
                    title={item.value}
                  >
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
            {!storageQuery.isPending &&
            storageMode === 'partitions' &&
            !storage?.volumes.length ? (
              <p className="text-sm text-white/60">
                Nenhuma partição montada encontrada.
              </p>
            ) : null}
          </div>
        </div>
      </Widget>
      {storageTooltip ? (
        <ChartTooltip
          title={storageTooltip.label}
          subtitle={storageTooltip.details}
          value=""
          portal
          interactive
          onPointerEnter={() => {
            if (storageTooltipLeaveTimeout.current !== null)
              window.clearTimeout(storageTooltipLeaveTimeout.current)
          }}
          onPointerLeave={() => {
            storageTooltipLeaveTimeout.current = window.setTimeout(
              () => setStorageTooltip(null),
              220,
            )
          }}
          className="fixed max-w-[min(420px,calc(100vw-24px))] overflow-x-auto whitespace-nowrap"
          style={{
            left: Math.max(
              12,
              Math.min(storageTooltip.x, window.innerWidth - 12),
            ),
            top: Math.max(
              12,
              Math.min(storageTooltip.y, window.innerHeight - 92),
            ),
            transform: 'translateX(-50%)',
          }}
        />
      ) : null}

      <ProcessingLoad />

      <Widget
        icon="SquareStack"
        title="Applications"
        className="col-span-1 col-start-1 row-span-3 row-start-4 min-h-0"
      >
        <div className="flex items-start pt-8">
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#070b1f]">
              <div className="h-8 w-8 rounded-full border-[5px] border-[#8fbfff] border-b-[#40d7ff] border-l-[#40d7ff]" />
            </div>
            <p className="text-xs font-semibold text-white">Jellyfin</p>
          </div>
        </div>
      </Widget>

      <InputOutput />

      <Widget
        icon="Compass"
        title="Shortcuts"
        className="col-span-1 col-start-2 row-span-2 row-start-5 min-h-0"
      >
        <div className="flex items-start pt-4">
          <p className="text-sm font-semibold text-white">Dashboard Content</p>
        </div>
      </Widget>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  return `${(bytes / 1024 ** index).toFixed(index > 2 ? 0 : 1)}${units[index]}`
}
