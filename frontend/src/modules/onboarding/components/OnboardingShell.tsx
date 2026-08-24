import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useOutlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/core/components/ui/Button'
import { GlassStackLoader } from '@/core/components/ui/GlassStackLoader'
import { useLockStore } from '@/core/stores/lock'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { GlassAPIError } from '@/lib/glass-api'
import { getSetupStatus } from '@/modules/auth/api/auth'
import { OnboardingTimeline } from './OnboardingTimeline'
import { OnboardingActionsProvider, type OnboardingAction } from './OnboardingActions'
import { AccountPage } from '../pages/AccountPage'
import { ConnectPage } from '../pages/ConnectPage'
import { MfaPage } from '../pages/MfaPage'
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
}

const stages: OnboardingStage[] = ['connect', 'account', 'theme', 'mfa', 'security']
const transitionStages: OnboardingStage[] = ['welcome', ...stages]

type TransitionDirection = -1 | 0 | 1

const stageTransitionVariants = {
  enter: (direction: TransitionDirection) => ({
    opacity: 0,
    x: direction * 40,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: TransitionDirection) => ({
    opacity: 0,
    x: direction * -32,
  }),
}

export function OnboardingShell({ standalone = false }: { standalone?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const [action, setAction] = useState<OnboardingAction | null>(null)
  const setup = useQuery({ queryKey: ['auth', 'setup'], queryFn: getSetupStatus, retry: false, enabled: !standalone, refetchOnWindowFocus: false })
  const state = useOnboardingStore()

  useEffect(() => {
    // An onboarding visit is always a fresh setup attempt. Remove only the
    // onboarding session, never unrelated application storage.
    sessionStorage.removeItem('glassstack-onboarding')
    localStorage.removeItem('glassstack-onboarding')
    useOnboardingStore.getState().reset()
    useLockStore.getState().reset()
    const isDark = document.documentElement.classList.contains('dark')
    useOnboardingStore.getState().setField('theme', isDark ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('bootstrap')
    if (token) {
      useOnboardingStore.getState().setField('bootstrapToken', token)
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }, [])

  const firstIncomplete = useMemo(() => {
    if (!state.bootstrapToken.trim()) return 'connect' as const
    if (!state.completedStages.includes('account')) return 'account' as const
    if (!state.completedStages.includes('theme')) return 'theme' as const
    if (!state.completedStages.includes('mfa')) return 'mfa' as const
    return 'security' as const
  }, [state.bootstrapToken, state.completedStages])

  const requested = location.pathname === '/onboarding'
    ? 'welcome' as const
    : stages.find((stage) => location.pathname === paths[stage])
  const requestedIndex = requested ? stages.indexOf(requested) : -1
  const firstIndex = stages.indexOf(firstIncomplete)
  const current = requested ?? firstIncomplete
  const [presentedStage, setPresentedStage] = useState(current)
  const previousStageRef = useRef(current)
  const [settledDirection, setSettledDirection] =
    useState<Exclude<TransitionDirection, 0>>(1)
  const previousStageIndex = transitionStages.indexOf(previousStageRef.current)
  const currentStageIndex = transitionStages.indexOf(current)
  const transitionDirection: Exclude<TransitionDirection, 0> =
    currentStageIndex === previousStageIndex
      ? settledDirection
      : currentStageIndex > previousStageIndex
        ? 1
        : -1
  const motionDirection: TransitionDirection = shouldReduceMotion
    ? 0
    : transitionDirection

  useEffect(() => {
    headingRef.current?.focus()
  }, [location.pathname])

  useLayoutEffect(() => {
    if (previousStageRef.current === current) return

    previousStageRef.current = current
    setSettledDirection(transitionDirection)
  }, [current, transitionDirection])

  if (!standalone && setup.isPending) return <ShellLoading />
  if (!standalone && setup.isError) return <ShellError message={errorMessage(setup.error)} />
  if (!standalone && !setup.data?.required) return <Navigate to="/" replace />
  if (requestedIndex < 0 && requested !== 'welcome' || requestedIndex > firstIndex) {
    return <Navigate to={paths[firstIncomplete]} replace />
  }

  const presentedStageIndex =
    presentedStage === 'welcome' ? -1 : stages.indexOf(presentedStage)
  const isPresentedWelcome = presentedStage === 'welcome'
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
      className="grid min-h-dvh place-items-center overflow-auto bg-cover bg-center p-4 font-instrument text-[#243247] dark:text-white"
      style={{ backgroundImage: 'url("/images/onboarding/background.jpg")' }}
    >
      <OnboardingActionsProvider setAction={setAction}>
        <div
          className="relative isolate flex h-[min(800px,calc(100dvh-32px))] w-[min(1000px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-white/55 bg-white/58 p-6 text-[#151A21] shadow-2xl backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-black/35 dark:text-white sm:p-8"
          data-testid="onboarding-shell"
        >
          {!isPresentedWelcome ? (
            <>
              <header className="flex shrink-0 items-center gap-3">
                <img src="/images/onboarding/logo.png" alt="" className="size-16 object-contain sm:size-20" />
                <span className="font-encode text-3xl font-thin sm:text-4xl">Glass Stack</span>
              </header>
              <h1 ref={headingRef} tabIndex={-1} className="sr-only">Onboarding</h1>
              <OnboardingTimeline current={presentedStage} completed={state.completedStages} onSelect={goStage} />
            </>
          ) : null}

          <div
            className={`relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${
              isPresentedWelcome ? '' : 'mt-8'
            }`}
          >
            <AnimatePresence
              custom={motionDirection}
              initial={false}
              mode="wait"
              onExitComplete={() => setPresentedStage(current)}
            >
              <motion.div
                key={current}
                className="h-full"
                animate="center"
                custom={motionDirection}
                data-testid="onboarding-stage-transition"
                data-transition-direction={
                  transitionDirection === 1 ? 'forward' : 'backward'
                }
                exit="exit"
                initial="enter"
                transition={{
                  duration: shouldReduceMotion ? 0.1 : 0.2,
                  ease: [0.33, 1, 0.68, 1],
                }}
                variants={stageTransitionVariants}
              >
                {standalone ? <StandaloneStage stage={current} /> : outlet}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="mt-8 flex shrink-0 items-center justify-between gap-4 border-t border-black/10 pt-5 dark:border-white/10">
            {!isPresentedWelcome ? (
              <Button type="button" aria-label="Voltar" onClick={() => goStage(presentedStageIndex === 0 ? 'welcome' : stages[Math.max(0, presentedStageIndex - 1)])}>
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
    case 'mfa': return <MfaPage />
    case 'security': return <SecurityPage />
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
  return (
    <main className="grid min-h-dvh place-items-center bg-[#071525] text-white">
      <GlassStackLoader
        label="Conectando ao Glass Stack…"
        size={96}
      />
    </main>
  )
}

function ShellError({ message }: { message: string }) {
  return <main className="grid min-h-dvh place-items-center bg-[#071525] p-6 text-white"><p role="alert">{message}</p></main>
}

function errorMessage(error: unknown) {
  return error instanceof GlassAPIError ? error.message : 'Não foi possível conectar ao servidor.'
}
