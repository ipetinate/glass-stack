import { useNavigate } from 'react-router'

import { SelectableCard } from '@/modules/settings/components/SelectableCard'
import { ThemePreview } from '@/modules/settings/components/ThemeToggler'
import { useThemeStore } from '@/core/stores/theme'
import { useOnboardingStore } from '../stores/onboardingStore'
import { useOnboardingAction } from '../components/OnboardingActions'

export function ThemePage() {
  const navigate = useNavigate()
  const state = useOnboardingStore()
  useOnboardingAction({ label: 'Próximo', onClick: () => { state.markCompleted('theme'); state.setStage('security'); navigate('/onboarding/security') } })

  const select = (theme: 'light' | 'dark') => {
    state.setField('theme', theme)
    useThemeStore.getState().setTheme(theme)
  }

  return (
    <section>
      <h2 className="text-3xl font-extralight sm:text-4xl">Qual variação de tema você prefere?</h2>
      <div className="mt-16 flex justify-center gap-5">
        {(['light', 'dark'] as const).map((theme) => (
          <SelectableCard
            key={theme}
            ariaLabel={theme === 'light' ? 'Claro' : 'Escuro'}
            className="w-52"
            title={theme === 'light' ? 'Light' : 'Dark'}
            description={theme === 'light' ? 'Bright surfaces with dark text.' : 'Deep surfaces with light text.'}
            selected={state.theme === theme}
            selectedIndicatorPosition="bottom-right"
            onSelect={() => select(theme)}
          >
            <ThemePreview theme={theme} />
          </SelectableCard>
        ))}
      </div>
    </section>
  )
}
