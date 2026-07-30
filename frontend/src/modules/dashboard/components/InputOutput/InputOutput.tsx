import { useEvents } from '@/modules/dashboard/repositories/events'
import { useMemo } from 'react'

import { BadgeInfoIcon } from 'lucide-react'
import { InputOutputWidget } from '../InputOutputWidget'
import { MetricChart } from '../MetricChart'
import { getIOEvents, getMetricGroups } from './InputOutput.functions'

import { INPUT_OUTPUT_HISTORY_SIZE } from './InputOutput.constants'

export function InputOutput() {
  const { data = [], error, isPending } = useEvents()
  const ioEvents = useMemo(
    () => getIOEvents(data, INPUT_OUTPUT_HISTORY_SIZE),
    [data],
  )

  if (error) {
    return (
      <InputOutputWidget>
        <div className="flex size-full items-center justify-center gap-2">
          <BadgeInfoIcon className="size-5 text-rose-300" />
          <p className="text-rose-300">
            Não foi possível obter os dados de I/O
          </p>
        </div>
      </InputOutputWidget>
    )
  }

  if (isPending || ioEvents.length === 0) {
    return (
      <InputOutputWidget>
        <div className="flex size-full items-center justify-center">
          <p className="text-sm text-white/70">
            Aguardando métricas do sistema…
          </p>
        </div>
      </InputOutputWidget>
    )
  }

  const groups = getMetricGroups(ioEvents)

  return (
    <InputOutputWidget>
      <div className="grid h-full w-full grid-cols-3 items-end gap-4">
        {groups.map((group) => (
          <div key={group.label} className="flex min-w-0 flex-col gap-3">
            <p className="text-xs font-bold text-[#b7cae7]">{group.label}</p>
            {group.lines.map((line) => (
              <MetricChart key={line.label} line={line} />
            ))}
          </div>
        ))}
      </div>
    </InputOutputWidget>
  )
}
