import {
  KeyRound,
  Palette,
  PlugZap,
  RotateCcwKey,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import type { OnboardingStage } from '../stores/onboardingStore'

type TimelineStage = Exclude<OnboardingStage, 'welcome'>

const stages: Array<{
  stage: TimelineStage
  label: string
  Icon: LucideIcon
}> = [
  { stage: 'connect', label: 'Conexão', Icon: PlugZap },
  { stage: 'account', label: 'Conta', Icon: UserRound },
  { stage: 'theme', label: 'Aparência', Icon: Palette },
  { stage: 'security', label: 'Segurança', Icon: ShieldCheck },
  { stage: 'mfa', label: 'MFA', Icon: KeyRound },
  { stage: 'recovery', label: 'Recuperação', Icon: RotateCcwKey },
]

export function OnboardingTimeline({
  current,
  completed,
  onSelect,
}: {
  current: OnboardingStage
  completed: OnboardingStage[]
  onSelect: (stage: OnboardingStage) => void
}) {
  return (
    <nav
      aria-label="Etapas do onboarding"
      className="mx-auto mt-6 w-full max-w-3xl"
    >
      <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {stages.map(({ stage, label, Icon }, index) => {
          const isCurrent = stage === current
          const isCompleted = completed.includes(stage)
          const isAvailable = isCurrent || isCompleted

          return (
            <li key={stage} className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                disabled={!isAvailable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${label}${isCompleted ? ' concluída' : ''}`}
                onClick={() => isAvailable && onSelect(stage)}
                className={`group relative flex items-center gap-1.5 px-2 py-1 text-[11px] transition focus-visible:outline-none sm:px-2.5 ${
                  isCurrent
                    ? 'text-current'
                    : isCompleted
                      ? 'text-current/75 hover:bg-white/20 dark:hover:bg-black/20'
                      : 'cursor-not-allowed text-current/35'
                }`}
              >
                {isCurrent ? (
                  <motion.span
                    layoutId="onboarding-current-stage"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 z-0 rounded-sm bg-white/35 dark:bg-black/30"
                    aria-hidden="true"
                  />
                ) : null}

                <span className="relative z-10 grid size-4 place-items-center">
                  <Icon
                    aria-hidden="true"
                    className="size-3"
                    strokeWidth={1.75}
                  />
                </span>

                <span className="relative z-10 hidden sm:inline">
                  {label}
                </span>
              </button>

              {index < stages.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="h-px w-3 bg-current/20 sm:w-6"
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
