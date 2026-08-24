import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { PinCodeField } from '@/core/components/form'
import { Button } from '@/core/components/ui/Button'
import { useEventSamplingStore } from '@/core/stores/event-sampling'
import { useWallpaperStore } from '@/core/stores/wallpaper'
import { useWindowAppearanceStore } from '@/core/stores/window-appearance'
import { beginSetupTOTP, completeSetup } from '../api/onboarding'
import { useOnboardingAction } from '../components/OnboardingActions'
import { OnboardingStage, OnboardingStageTitle } from '../components/OnboardingStage'
import { StageError } from '../components/OnboardingShell'
import { useOnboardingStore } from '../stores/onboardingStore'

export function MfaPage() {
  const navigate = useNavigate()
  const state = useOnboardingStore()
  const [preparing, setPreparing] = useState(Boolean(!state.enrollment))
  const [copied, setCopied] = useState(false)
  const completed = state.recoveryCodes.length > 0
  const lastSubmittedCode = useRef('')
  const totpCodeRef = useRef(state.totpCode)
  totpCodeRef.current = state.totpCode

  useEffect(() => {
    if (state.enrollment || completed) return
    let active = true
    void beginSetupTOTP({ bootstrapToken: state.bootstrapToken, username: state.username })
      .then((enrollment) => { if (active) state.setField('enrollment', enrollment) })
      .catch(() => { if (active) state.setField('error', 'Não foi possível iniciar a proteção MFA.') })
      .finally(() => { if (active) setPreparing(false) })
    return () => { active = false }
  }, [completed, state.bootstrapToken, state.enrollment, state.username])

  useEffect(() => { if (!copied) return; const timeout = window.setTimeout(() => setCopied(false), 2000); return () => window.clearTimeout(timeout) }, [copied])

  useEffect(() => {
    const code = totpCodeRef.current
    if (completed || state.submitting || code.length !== 6) return
    if (code === lastSubmittedCode.current) return
    lastSubmittedCode.current = code
    const form = document.getElementById('onboarding-mfa-form') as HTMLFormElement | null
    form?.requestSubmit()
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!state.enrollment || state.totpCode.length !== 6) return
    state.setField('submitting', true)
    state.setField('error', '')
    try {
      const wallpaper = useWallpaperStore.getState().selectedWallpaper
      const appearance = useWindowAppearanceStore.getState()
      const result = await completeSetup({ bootstrapToken: state.bootstrapToken, challengeToken: state.enrollment.challengeToken, username: state.username, password: state.password, totpCode: state.totpCode, preferences: { schemaVersion: 1, locale: state.locale, theme: state.theme, avatarPresetId: state.avatar.presetId ?? 'custom', avatarUrl: state.avatar.imageUrl, displayName: state.displayName || undefined, wallpaperId: wallpaper.id, windowAppearance: { backgroundMode: appearance.backgroundMode, actionVisibility: appearance.actionVisibility }, lockScreen: { autoLockMinutes: 15 }, eventSamplingSeconds: useEventSamplingStore.getState().intervalSeconds, dashboard: { version: 1 } } })
      state.setField('recoveryCodes', result.recoveryCodes)
      state.markCompleted('mfa')
    } catch { state.setField('error', 'O código informado não é válido.'); lastSubmittedCode.current = '' } finally { state.setField('submitting', false) }
  }

  useOnboardingAction({
    label: completed ? 'Continuar' : state.submitting ? 'Verificando…' : 'Próximo',
    type: completed ? 'button' : 'submit',
    form: completed ? undefined : 'onboarding-mfa-form',
    disabled: state.submitting || (!completed && (preparing || state.totpCode.length !== 6)),
    onClick: completed ? () => { state.setStage('security'); navigate('/onboarding/security') } : undefined,
  })
  if (preparing && !state.enrollment) return <OnboardingStage><OnboardingStageTitle>Proteja sua conta administradora</OnboardingStageTitle><p className="mt-8 text-lg">Preparando sua autenticação…</p></OnboardingStage>
  if (!state.enrollment && !completed) return <OnboardingStage><OnboardingStageTitle>Proteja sua conta administradora</OnboardingStageTitle>{state.error ? <StageError>{state.error}</StageError> : null}</OnboardingStage>

  const enrollment = state.enrollment
  return <form id="onboarding-mfa-form" onSubmit={submit}><OnboardingStage><OnboardingStageTitle>{completed ? 'Guarde seus códigos de recuperação' : 'Proteja sua conta administradora'}</OnboardingStageTitle>{completed ? <><p className="mt-8 text-lg">Cada código funciona uma vez e não será mostrado novamente.</p><div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white/30 p-6 font-mono text-sm dark:bg-[#111c2b]/55 sm:text-base">{state.recoveryCodes.map((code) => <span key={code}>{code}</span>)}</div><Button type="button" className="mt-5" onClick={() => void navigator.clipboard.writeText(state.recoveryCodes.join('\n')).then(() => setCopied(true))}>{copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />} {copied ? 'Copiado' : 'Copiar códigos'}</Button><span aria-live="polite" className="sr-only">{copied ? 'Códigos de recuperação copiados.' : ''}</span></> : <div className="mt-8 grid items-start gap-8 sm:grid-cols-[240px_minmax(0,1fr)]"><img src={enrollment!.qrCodeDataUri} alt="QR code para configurar autenticação" className="size-60 rounded-2xl bg-white p-3" /><div className="min-w-0"><p className="text-lg">Escaneie o QR code com seu aplicativo autenticador.</p><code className="mt-5 block break-all rounded-lg bg-white/35 p-3 text-xs dark:bg-[#111c2b]/55">{enrollment!.secret}</code><PinCodeField label="Código de 6 dígitos" fields={6} groups={2} separator value={state.totpCode} onChange={(value) => state.setField('totpCode', value)} className="mt-6 w-full" /></div></div>}{state.error ? <StageError>{state.error}</StageError> : null}</OnboardingStage></form>
}
