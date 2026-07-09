import { GlassCheckbox } from '@/core/components/form/checkbox'
import {
  type WindowBackgroundMode,
  useWindowAppearanceStore,
} from '@/core/stores/window-appearance'
import { SelectableCard } from '@/modules/settings/components/SelectableCard'

import { WindowBackgroundPreview } from './WindowBackgroundPreview'

const backgroundOptions: Array<{
  id: WindowBackgroundMode
  title: string
  description: string
  recommended?: boolean
}> = [
  {
    id: 'solid',
    title: 'Solid',
    description: 'Improves focus and contrast by avoiding distractions.',
    recommended: true,
  },
  {
    id: 'blur',
    title: 'Blur',
    description: 'Uses the default glass blur background.',
  },
]

export function WindowSettings() {
  const {
    actionVisibility,
    backgroundMode,
    setActionVisibility,
    setBackgroundMode,
  } = useWindowAppearanceStore()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-7">
        {backgroundOptions.map((option) => (
          <SelectableCard
            key={option.id}
            ariaLabel={`Use ${option.title} windows`}
            className="w-56"
            title={option.title}
            description={option.description}
            selected={backgroundMode === option.id}
            selectedIndicatorPosition="bottom-right"
            onSelect={() => setBackgroundMode(option.id)}
          >
            <WindowBackgroundPreview mode={option.id} />

            {option.recommended && (
              <span className="w-fit rounded-full bg-emerald-400/18 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/14 dark:text-emerald-200">
                Recommended
              </span>
            )}
          </SelectableCard>
        ))}
      </div>

      <div className="rounded-xl border border-black/10 bg-white/35 p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-semibold">Actions</h2>

        <div className="mt-4 flex flex-col gap-3">
          <GlassCheckbox
            checked={actionVisibility.verticalExpand}
            label="Expand up"
            onChange={(event) =>
              setActionVisibility('verticalExpand', event.currentTarget.checked)
            }
          />
          <GlassCheckbox
            checked={actionVisibility.maximize}
            label="Maximize"
            onChange={(event) =>
              setActionVisibility('maximize', event.currentTarget.checked)
            }
          />
          <GlassCheckbox
            checked={actionVisibility.close}
            label="Close"
            onChange={(event) =>
              setActionVisibility('close', event.currentTarget.checked)
            }
          />
        </div>
      </div>
    </div>
  )
}
