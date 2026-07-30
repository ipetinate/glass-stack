import { useNavigate } from 'react-router'

import { SelectableCard } from '@/modules/settings/components/SelectableCard'
import { ThemePreview } from '@/modules/settings/components/ThemeToggler'
import { useThemeStore } from '@/core/stores/theme'
import { useOnboardingStore } from '../stores/onboardingStore'
import { useOnboardingAction } from '../components/OnboardingActions'
import { OnboardingStage, OnboardingStageTitle } from '../components/OnboardingStage'

export function ThemePage() {
  const navigate = useNavigate()
  const state = useOnboardingStore()
  useOnboardingAction({ label: 'Próximo', onClick: () => { state.markCompleted('theme'); state.setStage('mfa'); navigate('/onboarding/mfa') } })

  const select = (theme: 'light' | 'dark') => {
    state.setField('theme', theme)
    useThemeStore.getState().setTheme(theme)
  }

  return (
    <OnboardingStage>
      <OnboardingStageTitle>Qual variação de tema você prefere?</OnboardingStageTitle>
      <div className="mt-10 flex flex-wrap justify-center gap-5 sm:mt-14">
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
    </OnboardingStage>
  )
}
