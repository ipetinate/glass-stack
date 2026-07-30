import {
  AlertTriangleIcon,
  ClipboardPasteIcon,
  CopyCheckIcon,
  CopyIcon,
  FileKey2,
  FolderOpen,
  Shield,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { GlassInput } from '@/core/components/form'
import { useOnboardingAction } from '../components/OnboardingActions'
import { StageError } from '../components/OnboardingShell'
import {
  OnboardingStage,
  OnboardingStageTitle,
} from '../components/OnboardingStage'
import { useOnboardingStore } from '../stores/onboardingStore'
import { validateSetupToken } from '../api/onboarding'

const bootstrapTokenPath = 'GLASS_DATA_DIR/secrets/bootstrap-token'

export function ConnectPage() {
  const navigate = useNavigate()
  const state = useOnboardingStore()
  const [pathCopied, setPathCopied] = useState(false)
  const [validating, setValidating] = useState(false)
  useOnboardingAction({
    label: 'Continuar',
    type: 'submit',
    form: 'onboarding-connect-form',
    disabled: !state.bootstrapToken.trim() || validating,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pathCopied) return

    const timeout = window.setTimeout(() => setPathCopied(false), 2_000)

    return () => window.clearTimeout(timeout)
  }, [pathCopied])

  const copyBootstrapTokenPath = async () => {
    try {
      await window.navigator.clipboard.writeText(bootstrapTokenPath)
      setPathCopied(true)
    } catch {
      state.setField(
        'error',
        'Não foi possível copiar o caminho para a área de transferência.',
      )
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!state.bootstrapToken.trim()) return
    setValidating(true)
    state.setField('error', '')
    try {
      await validateSetupToken(state.bootstrapToken.trim())
      state.markCompleted('connect')
      state.setStage('account')
      navigate('/onboarding/account')
    } catch {
      state.setField('error', 'O token de configuração é inválido ou expirou.')
    } finally {
      setValidating(false)
    }
  }

  const readTokenFile = async (file: File) => {
    const token = (await file.text()).trim()

    if (token) {
      state.setField('bootstrapToken', token)
      state.setField('error', '')
    } else {
      state.setField(
        'error',
        'O arquivo selecionado não contém um token válido.',
      )
    }
  }
  return (
    <form
      id="onboarding-connect-form"
      onSubmit={submit}
      className="mx-auto w-full max-w-3xl"
    >
      <OnboardingStageTitle>
        Conecte este navegador ao servidor
      </OnboardingStageTitle>

      <OnboardingStage className="mt-8 space-y-8 rounded-2xl border border-slate-900/10 bg-white/30 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#111c2b]/55 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-300/15 text-cyan-500 dark:text-cyan-200">
            <Shield aria-hidden="true" size={24} />
          </span>

          <div>
            <h3 className="text-lg font-medium">
              Verificação de primeiro acesso
            </h3>

            <p className="mt-1 text-sm leading-6 opacity-75 flex flex-row gap-2 items-center">
              <ClipboardPasteIcon className="size-4" /> Cole o token de uso
              único mostrado no log do servidor.
            </p>
          </div>
        </div>

        <GlassInput
          autoFocus
          allowPaste
          label="Token de configuração"
          aria-label="Bootstrap token"
          value={state.bootstrapToken}
          onChange={(e) => state.setField('bootstrapToken', e.target.value)}
          onPasteValue={(token) => state.setField('bootstrapToken', token)}
          autoComplete="off"
          spellCheck={false}
          className="font-mono w-full"
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="text/plain,.token"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void readTokenFile(file)
              event.currentTarget.value = ''
            }}
          />

          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/25 px-4 text-sm font-medium text-[#151A21]/80 shadow-sm backdrop-blur-md transition hover:bg-white/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 dark:border-white/15 dark:bg-white/10 dark:text-white/90 dark:hover:bg-white/15"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen aria-hidden="true" size={17} />
            Procurar arquivo
          </button>

          <span className="inline-flex items-center gap-2 text-xs opacity-70">
            <FileKey2 aria-hidden="true" className="size-4" />
            <span className="inline-flex items-center">
              <span className="mr-2">
                O servidor informa o caminho exato no log (normalmente em:
              </span>
              <code className="inline-flex items-center gap-1 rounded bg-slate-900/10 pl-1.5 backdrop-blur-md dark:bg-white/10">
                {bootstrapTokenPath}

                <button
                  type="button"
                  aria-label={
                    pathCopied ? 'Caminho copiado' : 'Copiar caminho do token'
                  }
                  className="grid size-5 place-items-center rounded transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 dark:hover:bg-white/10"
                  onClick={() => void copyBootstrapTokenPath()}
                >
                  {!pathCopied ? (
                    <CopyIcon aria-hidden="true" className="size-3" />
                  ) : (
                    <CopyCheckIcon aria-hidden="true" className="size-3" />
                  )}
                </button>
              </code>
              ).
            </span>

            <span aria-live="polite" className="sr-only">
              {pathCopied
                ? 'Caminho copiado para a área de transferência.'
                : ''}
            </span>
          </span>
        </div>

        <span className="inline-flex items-center gap-2 text-xs opacity-70">
          <AlertTriangleIcon className="size-4 text-slate-700/70 dark:text-white/60" />
          <p className="text-xs leading-5 text-slate-700/70 dark:text-white/60">
            O token expira em 24 horas e é removido depois da configuração.
          </p>
        </span>

        {state.error ? <StageError>{state.error}</StageError> : null}
      </OnboardingStage>
    </form>
  )
}
