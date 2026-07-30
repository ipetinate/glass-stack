import {
  AlertTriangle,
  Check,
  LoaderCircle,
  ShieldQuestion,
  X,
} from 'lucide-react'

import { cn } from '@/core/functions/class-name'

import type { PasswordSafetyState } from './usePasswordSafety'

const messages = {
  'pt-BR': {
    idle: 'verificação contra vazamentos conhecidos',
    checking: 'verificando vazamentos conhecidos…',
    safe: 'não encontrada em vazamentos conhecidos',
    compromised: 'encontrada em vazamentos conhecidos',
    unavailable: 'lista local aprovada; consulta completa indisponível',
  },
  en: {
    idle: 'Check against known data breaches',
    checking: 'Checking known data breaches…',
    safe: 'Not found in known data breaches',
    compromised: 'Found in known data breaches',
    unavailable: 'Local list passed; full check unavailable',
  },
} as const

export function PasswordSafetyStatus({
  assessment,
  className,
  locale = 'en',
}: {
  assessment: PasswordSafetyState
  className?: string
  locale?: keyof typeof messages
}) {
  const message = messages[locale][assessment.status]
  const Icon =
    assessment.status === 'checking'
      ? LoaderCircle
      : assessment.status === 'safe'
        ? Check
        : assessment.status === 'compromised'
          ? X
          : assessment.status === 'unavailable'
            ? AlertTriangle
            : ShieldQuestion

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2',
        assessment.status === 'safe' && 'text-emerald-500 dark:text-emerald-300',
        assessment.status === 'compromised' && 'text-rose-300',
        assessment.status === 'unavailable' && 'text-amber-300',
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        size={15}
        className={assessment.status === 'checking' ? 'animate-spin' : undefined}
      />
      <span>
        {message}
        {assessment.status === 'compromised' &&
        assessment.occurrences !== undefined
          ? locale === 'pt-BR'
            ? ` (${assessment.occurrences.toLocaleString('pt-BR')} ocorrências)`
            : ` (${assessment.occurrences.toLocaleString('en-US')} occurrences)`
          : ''}
      </span>
    </p>
  )
}
