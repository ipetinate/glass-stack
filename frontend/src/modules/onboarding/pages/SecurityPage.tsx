import { Network, PartyPopper, Shield, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'

import { useThemeStore } from '@/core/stores/theme'
import { onboardingKeys } from '../api/onboarding'
import { useOnboardingAction } from '../components/OnboardingActions'
import { OnboardingStage, OnboardingStageTitle } from '../components/OnboardingStage'
import { StageError } from '../components/OnboardingShell'
import { clearOnboardingSecrets, useOnboardingStore } from '../stores/onboardingStore'

const tips = [
  [Shield, 'Primeiro de tudo: configure o firewall do seu servidor corretamente.'],
  [Network, 'Não exponha seu servidor à internet sem habilitar HTTPS e um proxy confiável.'],
  [UserRoundCheck, 'Configure uma senha segura e não a compartilhe com ninguém.'],
  [PartyPopper, 'Acima de tudo, divirta-se explorando seu homelab. Seja bem-vindo!'],
] as const

export function SecurityPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const state = useOnboardingStore()
  const [finishing, setFinishing] = useState(false)

  const finish = async () => {
    setFinishing(true)
    try {
      state.markCompleted('security')
      useThemeStore.getState().setTheme(state.theme)
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.setup })
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.session })
      clearOnboardingSecrets()
      state.reset()
      navigate('/', { replace: true })
    } finally {
      setFinishing(false)
    }
  }

  useOnboardingAction({ label: finishing ? 'Entrando…' : 'Entrar', disabled: finishing, onClick: () => void finish() })

  return <OnboardingStage><OnboardingStageTitle>Recomendações</OnboardingStageTitle><div className="mt-8 space-y-4">{tips.map(([Icon, text]) => <div key={text} className="flex min-h-14 items-center gap-4 rounded-xl bg-white/35 px-5 py-3 text-sm backdrop-blur-md dark:bg-[#111c2b]/55"><Icon aria-hidden="true" size={25} strokeWidth={1.5} /><p>{text}</p></div>)}</div>{state.error ? <StageError>{state.error}</StageError> : null}</OnboardingStage>
}
