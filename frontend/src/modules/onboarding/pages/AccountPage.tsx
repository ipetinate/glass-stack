import { useMemo } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { Input } from '@/core/components/form'
import { AvatarPicker } from '@/modules/auth/components/AvatarPicker'
import { PasswordSafetyStatus, usePasswordSafety } from '@/modules/auth/components/PasswordSafety'
import { useOnboardingStore } from '../stores/onboardingStore'
import { StageError } from '../components/OnboardingShell'
import { useOnboardingAction } from '../components/OnboardingActions'
import { OnboardingCheck, OnboardingStageTitle } from '../components/OnboardingStage'

export function AccountPage() {
  const navigate = useNavigate()
  const state = useOnboardingStore()
  const safety = usePasswordSafety(state.password)
  const valid = useMemo(() => Array.from(state.password.normalize('NFC')).length >= 15, [state.password])
  useOnboardingAction({ label: safety.isChecking ? 'Verificando…' : 'Próximo', type: 'submit', form: 'onboarding-account-form', disabled: !state.username || !state.password || !state.confirmation || safety.isChecking || safety.isCompromised })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!state.username || !valid || state.password !== state.confirmation) return
    const assessment = await safety.check()
    if (!assessment || assessment.status === 'compromised') {
      state.setField('error', 'Esta senha apareceu em vazamentos conhecidos. Escolha outra senha.')
      return
    }
    state.markCompleted('account')
    state.setStage('theme')
    navigate('/onboarding/theme')
  }
  return (
    <form id="onboarding-account-form" onSubmit={submit} className="mx-auto max-w-3xl">
      <OnboardingStageTitle>Agora crie uma conta de acesso</OnboardingStageTitle>
      <div className="mx-auto mt-10 max-w-md space-y-4">
        <AvatarPicker value={state.avatar} onChange={(value) => state.setField('avatar', value)} showPresets={false} />
        <Input label="Nome de exibição" value={state.displayName} onChange={(e) => state.setField('displayName', e.target.value)} autoComplete="name" />
        <Input label="Username" aria-label="username" value={state.username} onChange={(e) => state.setField('username', e.target.value)} autoComplete="username" required />
        <Input label="Senha" aria-label="password" type="password" value={state.password} onChange={(e) => state.setField('password', e.target.value)} onBlur={() => void safety.check()} autoComplete="new-password" required />
        <div className="space-y-1 px-1"><OnboardingCheck valid={valid}>mínimo de 15 caracteres</OnboardingCheck><PasswordSafetyStatus assessment={safety.assessment} locale="pt-BR" /></div>
        <Input label="Confirmar senha" aria-label="confirm password" type="password" value={state.confirmation} onChange={(e) => state.setField('confirmation', e.target.value)} autoComplete="new-password" required />
        <OnboardingCheck valid={state.password === state.confirmation && Boolean(state.confirmation)}>confirmação de senha confere</OnboardingCheck>
        {state.error ? <StageError>{state.error}</StageError> : null}
      </div>
    </form>
  )
}
