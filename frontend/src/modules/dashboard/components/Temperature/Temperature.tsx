import { InvertedGauge } from '@/core/components/charts'
import type { TemperatureEvent } from '@/modules/dashboard/api/queries'
import { Widget } from '@/modules/dashboard/components/Widget'
import { useEvents } from '@/modules/dashboard/repositories/events'
import { BadgeInfoIcon } from 'lucide-react'

const TEMPERATURE_GAUGE_ANIMATION = {
  duration: 650,
  easing: 'cubicOut' as const,
}

export function Temperature() {
  const { data = [], error, isPending } = useEvents()

  const latestEvent = data
    .filter((event): event is TemperatureEvent => event.type === 'temperature')
    .at(-1)

  if (error) {
    return (
      <Widget
        icon="ThermometerSnowflake"
        title="Temperature"
        className="col-span-1 col-start-1 row-span-2 row-start-3 min-h-0"
      >
        <div className="gap-2 flex flex-row items-center content-center justify-center w-full h-full">
          <BadgeInfoIcon className="size-5 text-rose-300" />
          <p className="text-rose-300">
            Não foi possível obter os dados de temperatura
          </p>
        </div>
      </Widget>
    )
  }

  if (isPending || !latestEvent) {
    return (
      <Widget
        icon="ThermometerSnowflake"
        title="Temperature"
        className="col-span-1 col-start-1 row-span-2 row-start-3 min-h-0"
      >
        <div className="flex size-full items-center justify-center">
          <p className="text-sm text-white/70">
            Aguardando dados dos sensores…
          </p>
        </div>
      </Widget>
    )
  }

  return (
    <Widget
      icon="ThermometerSnowflake"
      title="Temperature"
      className="col-span-1 col-start-1 row-span-2 row-start-3 min-h-0"
    >
      <div className="grid h-full min-h-0 w-full grid-cols-2 items-center gap-6 overflow-hidden">
        <TemperatureGauge
          label="CPU"
          sensor={latestEvent.payload.cpuSensor}
          value={latestEvent.payload.cpu}
        />
        <TemperatureGauge
          label="GPU"
          sensor={latestEvent.payload.gpuSensor}
          value={latestEvent.payload.gpu}
        />
      </div>
    </Widget>
  )
}

type TemperatureGaugeProps = {
  label: string
  sensor?: string
  value: number | null
}

function TemperatureGauge({
  label,
  sensor,
  value,
}: TemperatureGaugeProps) {
  return (
    <div
      aria-label={`${label} sensor ${sensor ?? 'unavailable'}`}
      className="flex min-h-0 flex-col overflow-hidden"
      role="group"
      title={sensor}
    >
      <div className="min-h-0 flex-1">
        {value === null ? (
          <div className="flex size-full flex-col items-center justify-center gap-2">
            <p className="text-sm font-semibold text-[#b7cae7]">{label}</p>
            <p className="text-sm text-white/60">Sensor indisponível</p>
          </div>
        ) : (
          <InvertedGauge
            ariaLabel={`${label} temperature: ${Math.round(value)} degrees Celsius`}
            className="mx-auto h-full max-h-full w-auto max-w-full"
            width={220}
            height={126}
            statusLabel={label}
            statusColor="#b7cae7"
            indicatorColor="value"
            value={value}
            unit="°C"
            color={{
              type: 'linear',
              stops: [
                { offset: '0%', color: '#9bd0ff' },
                { offset: '60%', color: '#ffb02f' },
                { offset: '100%', color: '#ff5a4d' },
              ],
            }}
            animation={TEMPERATURE_GAUGE_ANIMATION}
          />
        )}
      </div>
    </div>
  )
}
