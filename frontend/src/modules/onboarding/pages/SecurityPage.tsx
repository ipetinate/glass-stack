import { Network, PartyPopper, Shield, UserRoundCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useState } from 'react'
import { beginSetupTOTP } from '../api/onboarding'
import { useOnboardingStore } from '../stores/onboardingStore'
import { StageError } from '../components/OnboardingShell'
import { useOnboardingAction } from '../components/OnboardingActions'
import { OnboardingStage, OnboardingStageTitle } from '../components/OnboardingStage'

const tips = [[Shield, 'Primeiro de tudo: configure o firewall do seu servidor corretamente.'], [Network, 'Não exponha seu servidor à internet sem habilitar HTTPS e um proxy confiável.'], [UserRoundCheck, 'Configure uma senha segura e não a compartilhe com ninguém.'], [PartyPopper, 'Acima de tudo, divirta-se explorando seu homelab. Seja bem-vindo!']] as const

export function SecurityPage() {
  const navigate = useNavigate(); const state = useOnboardingStore(); const [busy, setBusy] = useState(false)
  useOnboardingAction({ label: busy ? 'Preparando…' : 'Continuar', disabled: busy, onClick: () => void submit() })
  const submit = async () => { setBusy(true); state.setField('error', ''); try { const enrollment = await beginSetupTOTP({ bootstrapToken: state.bootstrapToken, username: state.username }); state.setField('enrollment', enrollment); state.markCompleted('security'); state.setStage('mfa'); navigate('/onboarding/mfa') } catch { state.setField('error', 'Não foi possível iniciar a proteção MFA.') } finally { setBusy(false) } }
  return <OnboardingStage><OnboardingStageTitle>Dicas de segurança</OnboardingStageTitle><div className="mt-8 space-y-4">{tips.map(([Icon, text]) => <div key={text} className="flex min-h-14 items-center gap-4 rounded-xl bg-white/35 px-5 py-3 text-sm backdrop-blur-md dark:bg-[#111c2b]/55"><Icon aria-hidden="true" size={25} strokeWidth={1.5} /><p>{text}</p></div>)}</div>{state.error ? <StageError>{state.error}</StageError> : null}</OnboardingStage>
}
