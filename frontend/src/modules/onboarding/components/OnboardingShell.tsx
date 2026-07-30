import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/core/components/ui/Button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { GlassAPIError } from '@/lib/glass-api'
import { getSetupStatus } from '@/modules/auth/api/auth'
import { OnboardingTimeline } from './OnboardingTimeline'
import { OnboardingActionsProvider, type OnboardingAction } from './OnboardingActions'
import { AccountPage } from '../pages/AccountPage'
import { ConnectPage } from '../pages/ConnectPage'
import { MfaPage } from '../pages/MfaPage'
import { RecoveryPage } from '../pages/RecoveryPage'
import { SecurityPage } from '../pages/SecurityPage'
import { ThemePage } from '../pages/ThemePage'
import { WelcomePage } from '../pages/WelcomePage'
import {
  useOnboardingStore,
  type OnboardingStage,
} from '../stores/onboardingStore'

const paths: Record<OnboardingStage, string> = {
  welcome: '/onboarding',
  connect: '/onboarding/connect',
  account: '/onboarding/account',
  theme: '/onboarding/theme',
  security: '/onboarding/security',
  mfa: '/onboarding/mfa',
  recovery: '/onboarding/recovery',
}

const stages: OnboardingStage[] = ['connect', 'account', 'theme', 'security', 'mfa', 'recovery']

export function OnboardingShell({ standalone = false }: { standalone?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const [action, setAction] = useState<OnboardingAction | null>(null)
  const setup = useQuery({ queryKey: ['auth', 'setup'], queryFn: getSetupStatus, retry: false, enabled: !standalone })
  const state = useOnboardingStore()

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('bootstrap')
    if (token) {
      state.setField('bootstrapToken', token)
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }, [])

  const firstIncomplete = useMemo(() => {
    if (!state.bootstrapToken.trim()) return 'connect' as const
    if (!state.completedStages.includes('account')) return 'account' as const
    if (!state.completedStages.includes('theme')) return 'theme' as const
    if (!state.completedStages.includes('security')) return 'security' as const
    if (!state.completedStages.includes('mfa')) return 'mfa' as const
    return 'recovery' as const
  }, [state.bootstrapToken, state.completedStages])

  const requested = location.pathname === '/onboarding'
    ? 'welcome' as const
    : stages.find((stage) => location.pathname === paths[stage])
  const requestedIndex = requested ? stages.indexOf(requested) : -1
  const firstIndex = stages.indexOf(firstIncomplete)

  useEffect(() => {
    headingRef.current?.focus()
  }, [location.pathname])

  if (!standalone && setup.isPending) return <ShellLoading />
  if (!standalone && setup.isError) return <ShellError message={errorMessage(setup.error)} />
  if (!standalone && !setup.data?.required) return <Navigate to="/" replace />
  if (requestedIndex < 0 && requested !== 'welcome' || requestedIndex > firstIndex) {
    return <Navigate to={paths[firstIncomplete]} replace />
  }

  const current = requested ?? firstIncomplete
  const currentIndex = current === 'welcome' ? -1 : stages.indexOf(current)
  const isWelcome = current === 'welcome'
  const goStage = (stage: OnboardingStage) => {
    if (stage === 'welcome') {
      state.setStage('welcome')
      navigate(paths.welcome)
      return
    }
    if (stage === 'connect' || state.completedStages.includes(stage) || stage === current) {
      state.setStage(stage)
      navigate(paths[stage])
    }
  }

  return (
    <main
      className="grid min-h-dvh place-items-center overflow-auto bg-cover bg-center p-4 font-instrument text-[#151A21] dark:text-white"
      style={{ backgroundImage: 'url("/images/onboarding/background.jpg")' }}
    >
      <OnboardingActionsProvider setAction={setAction}>
        <div className="relative flex min-h-[min(800px,calc(100dvh-32px))] w-[min(1000px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl bg-white/35 p-6 shadow-2xl backdrop-blur-[5px] dark:bg-black/35 sm:p-8">
          {!isWelcome ? (
            <>
              <header className="flex shrink-0 items-center gap-3">
                <img src="/images/onboarding/logo.png" alt="" className="size-16 object-contain sm:size-20" />
                <span className="font-encode text-3xl font-thin sm:text-4xl">Glass Stack</span>
              </header>
              <h1 ref={headingRef} tabIndex={-1} className="sr-only">Onboarding</h1>
              <OnboardingTimeline current={current} completed={state.completedStages} onSelect={goStage} />
            </>
          ) : null}

          <div className={`relative min-h-0 flex-1 ${isWelcome ? '' : 'mt-8'}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current}
                className="h-full"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: shouldReduceMotion ? 0.1 : 0.25 }}
              >
                {standalone ? <StandaloneStage stage={current} /> : <Outlet />}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="mt-8 flex shrink-0 items-center justify-between gap-4 border-t border-black/10 pt-5 dark:border-white/10">
            {!isWelcome ? (
              <Button type="button" aria-label="Voltar" onClick={() => goStage(currentIndex === 0 ? 'welcome' : stages[Math.max(0, currentIndex - 1)])}>
                <ArrowLeft aria-hidden="true" size={18} />
                <span className="sr-only">Voltar</span>
              </Button>
            ) : <span />}
            {action ? (
              <Button
                type={action.type ?? 'button'}
                form={action.form}
                disabled={action.disabled}
                onClick={action.onClick}
                size="lg"
                className="min-w-36 justify-between"
              >
                <span>{action.label}</span>
                <ArrowRight aria-hidden="true" size={22} />
              </Button>
            ) : null}
          </footer>
        </div>
      </OnboardingActionsProvider>
    </main>
  )
}

function StandaloneStage({ stage }: { stage: OnboardingStage }) {
  switch (stage) {
    case 'welcome': return <WelcomePage />
    case 'connect': return <ConnectPage />
    case 'account': return <AccountPage />
    case 'theme': return <ThemePage />
    case 'security': return <SecurityPage />
    case 'mfa': return <MfaPage />
    case 'recovery': return <RecoveryPage />
  }
}

export function OnboardingNextButton({
  disabled,
  label = 'Próximo',
  onClick,
  type = 'button',
}: {
  disabled?: boolean
  label?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <Button type={type} disabled={disabled} onClick={onClick} size="lg" className="min-w-36 justify-between">
      <span>{label}</span>
      <ArrowRight aria-hidden="true" size={22} />
    </Button>
  )
}

export function StageError({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-200">{children}</p>
}

function ShellLoading() {
  return <main className="grid min-h-dvh place-items-center bg-[#071525] text-white" role="status">Conectando ao Glass Stack…</main>
}

function ShellError({ message }: { message: string }) {
  return <main className="grid min-h-dvh place-items-center bg-[#071525] p-6 text-white"><p role="alert">{message}</p></main>
}

function errorMessage(error: unknown) {
  return error instanceof GlassAPIError ? error.message : 'Não foi possível conectar ao servidor.'
}
