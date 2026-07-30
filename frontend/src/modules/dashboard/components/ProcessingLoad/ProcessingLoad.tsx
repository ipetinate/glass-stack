import { MultiRingGauge } from '@/core/components/charts'
import type { CPUEvent, GPUEvent, TemperatureEvent } from '@/modules/dashboard/api/queries'
import { Widget } from '@/modules/dashboard/components/Widget'
import { useEvents } from '@/modules/dashboard/repositories/events'
import { BadgeInfoIcon } from 'lucide-react'

const GAUGE_ANIMATION = {
  duration: 700,
  easing: 'cubicOut' as const,
}

export function ProcessingLoad() {
  const { data = [], error, isPending } = useEvents()
  const latestCPU = data
    .filter((event): event is CPUEvent => event.type === 'cpu')
    .at(-1)
  const latestGPU = data
    .filter((event): event is GPUEvent => event.type === 'gpu')
    .at(-1)
  const latestTemperature = data
    .filter((event): event is TemperatureEvent => event.type === 'temperature')
    .at(-1)

  if (error) {
    return (
      <ProcessingWidget>
        <div className="flex size-full items-center justify-center gap-2">
          <BadgeInfoIcon className="size-5 text-rose-300" />
          <p className="text-rose-300">
            Não foi possível obter os dados de processamento
          </p>
        </div>
      </ProcessingWidget>
    )
  }

  if (isPending || (!latestCPU && !latestGPU)) {
    return (
      <ProcessingWidget>
        <div className="flex size-full items-center justify-center">
          <p className="text-sm text-white/70">
            Aguardando métricas de processamento…
          </p>
        </div>
      </ProcessingWidget>
    )
  }

  const perCore = latestCPU?.payload.perCore ?? []
  const overall = latestCPU?.payload.overall ?? null
  const coreAverage = average(perCore)
  const corePeak = perCore.length > 0 ? Math.max(...perCore) : null
  const temperature = latestTemperature?.payload.cpu ?? null

  return (
    <ProcessingWidget>
      <div className="grid h-full min-h-0 w-full grid-cols-2 items-center gap-3 overflow-hidden">
        <MultiRingGauge
          ariaLabel="CPU processing load"
          label="CPU"
          centerValue={overall}
          animation={GAUGE_ANIMATION}
          className="h-full w-full"
          rings={[
            {
              id: 'overall',
              label: 'Overall',
              value: overall,
              description: 'Uso total do processador',
            },
            {
              id: 'average',
              label: 'Core avg',
              value: coreAverage,
              description: 'Média de utilização entre os cores',
            },
            {
              id: 'peak',
              label: 'Core peak',
              value: corePeak,
              description: 'Maior utilização registrada entre os cores',
            },
            {
              id: 'temperature',
              label: 'Temperature',
              value: temperature,
              description: 'Temperatura atual do processador',
              color: {
                type: 'linear',
                stops: [
                  { offset: '0%', color: '#9bd0ff' },
                  { offset: '50%', color: '#ffffff' },
                  { offset: '80%', color: '#ffb02f' },
                  { offset: '100%', color: '#ff5a4d' },
                ],
              },
              unit: '°C',
            },
          ]}
          valueUnit="%"
        />
        <MultiRingGauge
          ariaLabel="GPU processing load"
          label="GPU"
          centerValue={latestGPU?.payload.usagePercent ?? null}
          animation={GAUGE_ANIMATION}
          className="h-full w-full"
          rings={[
            {
              id: 'overall',
              label: 'Overall',
              value: latestGPU?.payload.usagePercent ?? null,
              description: 'Uso total do processador gráfico',
            },
            {
              id: 'renderer',
              label: 'Renderer',
              value: latestGPU?.payload.rendererPercent ?? null,
              description: 'Carga do renderizador gráfico',
            },
            {
              id: 'tiler',
              label: 'Tiler',
              value: latestGPU?.payload.tilerPercent ?? null,
              description: 'Carga da etapa de tesselação gráfica',
            },
          ]}
        />
      </div>
    </ProcessingWidget>
  )
}


function average(values: number[]) {
  if (values.length === 0) return null

  return values.reduce((total, value) => total + value, 0) / values.length
}

function ProcessingWidget({ children }: PropsWithChildren) {
  return (
    <Widget
      icon="Cpu"
      title="Processing Load"
      className="col-span-1 col-start-1 row-span-3 row-start-1 min-h-0"
    >
      {children}
    </Widget>
  )
}
import type { PropsWithChildren } from 'react'
