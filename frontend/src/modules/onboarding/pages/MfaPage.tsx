import { useNavigate } from 'react-router'
import type { FormEvent } from 'react'
import { PinCodeField } from '@/core/components/form'
import { completeSetup } from '../api/onboarding'
import { useOnboardingStore } from '../stores/onboardingStore'
import { StageError } from '../components/OnboardingShell'
import { useOnboardingAction } from '../components/OnboardingActions'
import { useWallpaperStore } from '@/core/stores/wallpaper'
import { useWindowAppearanceStore } from '@/core/stores/window-appearance'
import { useEventSamplingStore } from '@/core/stores/event-sampling'
import { OnboardingStage, OnboardingStageTitle } from '../components/OnboardingStage'

export function MfaPage() {
  const navigate = useNavigate(); const state = useOnboardingStore()
  useOnboardingAction({ label: state.submitting ? 'Verificando…' : 'Próximo', type: 'submit', form: 'onboarding-mfa-form', disabled: state.submitting || state.totpCode.length !== 6 })
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!state.enrollment || state.totpCode.length !== 6) return; state.setField('submitting', true); state.setField('error', ''); try { const wallpaper = useWallpaperStore.getState().selectedWallpaper; const appearance = useWindowAppearanceStore.getState(); const result = await completeSetup({ bootstrapToken: state.bootstrapToken, challengeToken: state.enrollment.challengeToken, username: state.username, password: state.password, totpCode: state.totpCode, preferences: { schemaVersion: 1, locale: state.locale, theme: state.theme, avatarPresetId: state.avatar.presetId ?? 'custom', avatarUrl: state.avatar.imageUrl, displayName: state.displayName || undefined, wallpaperId: wallpaper.id, windowAppearance: { backgroundMode: appearance.backgroundMode, actionVisibility: appearance.actionVisibility }, eventSamplingSeconds: useEventSamplingStore.getState().intervalSeconds, dashboard: { version: 1 } } }); state.setField('recoveryCodes', result.recoveryCodes); state.markCompleted('mfa'); state.setStage('recovery'); navigate('/onboarding/recovery') } catch { state.setField('error', 'O código informado não é válido.') } finally { state.setField('submitting', false) } }
  if (!state.enrollment) return null
  return <form id="onboarding-mfa-form" onSubmit={submit}><OnboardingStage className="max-w-5xl"><OnboardingStageTitle>Proteja sua conta administradora</OnboardingStageTitle><div className="mt-8 grid items-start gap-10 sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"><img src={state.enrollment.qrCodeDataUri} alt="QR code para configurar autenticação" className="aspect-square w-full max-w-[280px] rounded-2xl bg-white p-3" /><div className="min-w-0"><p className="text-lg">Escaneie o QR code com seu aplicativo autenticador.</p><code className="mt-5 block break-all rounded-lg bg-white/35 p-3 text-xs dark:bg-[#111c2b]/55">{state.enrollment.secret}</code><PinCodeField label="Código de 6 dígitos" fields={6} groups={2} separator value={state.totpCode} onChange={(value) => state.setField('totpCode', value)} className="mt-6 w-full" /></div></div>{state.error ? <StageError>{state.error}</StageError> : null}</OnboardingStage></form>
}
