import { Sparkline } from '@/core/components/charts'

import { INPUT_OUTPUT_SPARKLINE_ANIMATION } from '../InputOutput/InputOutput.constants'
import type { MetricLine } from '../InputOutput/InputOutput.types'
import { getMetricChartState } from './MetricChart.functions'

export function MetricChart({ line }: { line: MetricLine }) {
  const state = getMetricChartState(line)

  if (!state) {
    return (
      <div className="flex h-[59px] flex-col gap-1">
        <p className="text-[9px] uppercase text-white/70">{line.label}</p>
        <p className="my-auto text-xs text-white/45">Indisponível</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[9px] uppercase text-white/70">{line.label}</p>
        <p className="truncate text-[9px] tabular-nums text-white/55">
          {state.formattedValue}
        </p>
      </div>
      <Sparkline
        ariaLabel={`${line.label}: ${state.formattedValue}`}
        className="w-full"
        data={state.chartValues}
        height={42}
        width={200}
        strokeWidth={1.4}
        color={line.color}
        fill={line.color}
        fillOpacity={0.2}
        endpointRadius={2}
        yDomain={line.yDomain}
        showTooltip
        tooltipFormat={line.format}
        animation={INPUT_OUTPUT_SPARKLINE_ANIMATION}
      />
    </div>
  )
}
