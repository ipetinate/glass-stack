import { Copy } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/core/components/ui/Button'
import { useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/core/stores/theme'
import { useOnboardingStore, clearOnboardingSecrets } from '../stores/onboardingStore'
import { useOnboardingAction } from '../components/OnboardingActions'
import { onboardingKeys } from '../api/onboarding'

export function RecoveryPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const state = useOnboardingStore()
  useOnboardingAction({ label: 'Entrar', onClick: () => void finish() })
  const finish = async () => { useThemeStore.getState().setTheme(state.theme); await queryClient.invalidateQueries({ queryKey: onboardingKeys.setup }); await queryClient.invalidateQueries({ queryKey: onboardingKeys.session }); clearOnboardingSecrets(); state.reset(); navigate('/', { replace: true }) }
  return <section><h2 className="text-3xl font-extralight sm:text-4xl">Guarde seus códigos de recuperação</h2><p className="mt-10 text-lg">Cada código funciona uma vez e não será mostrado novamente.</p><div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-white/30 p-6 font-mono text-sm dark:bg-black/30 sm:text-base">{state.recoveryCodes.map((code) => <span key={code}>{code}</span>)}</div><Button type="button" className="mt-5" onClick={() => void navigator.clipboard.writeText(state.recoveryCodes.join('\n'))}><Copy aria-hidden="true" size={18} /> Copiar códigos</Button></section>
}
