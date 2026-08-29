import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { AccordionCard } from '@/core/components/ui/AccordionCard'
import { resetSystem } from '@/modules/settings/api/admin'
import { SettingsSection } from '@/modules/settings/components/SettingsSection/SettingsSection'

const CONFIRMATION_WORD = 'CONFIRMAR'

export function AdvancedSettings() {
  return (
    <div>
      <SettingsSection title="System">
        <ResetSection />
      </SettingsSection>
    </div>
  )
}

function ResetSection() {
  const navigate = useNavigate()
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')

  const mutation = useMutation({
    mutationFn: resetSystem,
    onSuccess: () => {
      localStorage.clear()
      sessionStorage.clear()
      navigate('/onboarding', { replace: true })
    },
    onError: (error: unknown) => {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The system reset could not be completed.',
      )
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (confirmation !== CONFIRMATION_WORD) {
      setMessage('Type CONFIRMAR to confirm the reset.')
      return
    }
    mutation.mutate()
  }

  return (
    <AccordionCard
      icon={<AlertTriangle size={20} />}
      title="Factory Reset"
      description="Erase all data and restart the initial setup process."
      variant="danger"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-rose-300/20 bg-black/5 p-4 dark:bg-black/20">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
              This action will permanently delete:
            </p>
            <ul className="mt-2 space-y-1 text-sm opacity-80">
              <li>All user accounts and sessions</li>
              <li>All MFA credentials and recovery codes</li>
              <li>All settings and preferences</li>
              <li>All wallpapers and uploaded media</li>
              <li>All invitations and audit logs</li>
            </ul>
            <p className="mt-3 text-sm font-medium opacity-80">
              The system will restart the onboarding process as if it were a fresh install.
            </p>
          </div>

          <div>
            <label
              htmlFor="reset-confirmation"
              className="mb-1.5 block text-sm font-medium opacity-80"
            >
              Type <span className="font-bold">CONFIRMAR</span> to proceed:
            </label>
            <input
              id="reset-confirmation"
              type="text"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value)
                setMessage('')
              }}
              placeholder={CONFIRMATION_WORD}
              autoComplete="off"
              className="w-full rounded-xl border border-black/10 bg-white/50 px-4 py-2.5 text-sm placeholder:opacity-40 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-white/10 dark:bg-white/5 dark:focus:border-rose-400"
            />
          </div>

          {message && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{message}</p>
          )}

          <button
            type="submit"
            disabled={confirmation !== CONFIRMATION_WORD || mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:bg-rose-500/80"
          >
            <Trash2 size={16} />
            {mutation.isPending ? 'Resetting system…' : 'Reset system'}
          </button>
        </form>
    </AccordionCard>
  )
}
