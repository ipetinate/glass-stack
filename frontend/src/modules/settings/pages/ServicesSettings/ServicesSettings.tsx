import {
  type EventSamplingInterval,
  useEventSamplingStore,
} from '@/core/stores/event-sampling'
import { GlassSelect } from '@/core/components/form'
import { SettingsSection } from '@/modules/settings/components/SettingsSection'

export function ServicesSettings() {
  const { intervalSeconds, setIntervalSeconds } = useEventSamplingStore()

  return (
    <div>
      <SettingsSection title="Services">
        <div className="w-full max-w-xl rounded-xl border border-black/10 bg-white/35 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-sm font-semibold">System event sampling</h2>
              <p className="mt-1 max-w-sm text-sm text-black/60 dark:text-white/60">
                Controls how often GlassStack refreshes system metrics over the
                live event stream.
              </p>
            </div>

            <div className="w-36 shrink-0">
              <GlassSelect
                aria-label="Event sampling interval"
                value={intervalSeconds}
                onChange={(event) =>
                  setIntervalSeconds(
                    Number(event.currentTarget.value) as EventSamplingInterval,
                  )
                }
              >
                {[1, 2, 3, 4, 5].map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds} {seconds === 1 ? 'second' : 'seconds'}
                  </option>
                ))}
              </GlassSelect>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
