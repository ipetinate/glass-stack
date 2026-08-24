import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAppStore } from '@/core/stores/app'
import { useLockStore } from '@/core/stores/lock'
import { GlassAPIError } from '@/lib/glass-api'

import {
  authKeys,
  completeLoginMFA,
  login,
  unlock,
  type AuthIdentity,
} from '../../api/auth'

export type AuthFlowMode = 'lock' | 'login'

export function useAuthFlow({
  identity,
  mode,
}: {
  identity: AuthIdentity
  mode: AuthFlowMode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const setUser = useAppStore((state) => state.setUser)
  const unlockScreen = useLockStore((state) => state.unlock)
  const setRememberedUser = useLockStore((state) => state.setRememberedUser)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const destination =
    (location.state as { from?: string } | null)?.from ?? '/'

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'lock') {
        await unlock({ password })
        setSuccess(true)
        window.setTimeout(() => unlockScreen(), 300)
        return
      }
      if (challengeToken) {
        const result = await completeLoginMFA({ challengeToken, code })
        setUser(result.user)
      } else {
        const result = await login({ username: identity.username, password })
        if (result.mfaRequired) {
          setChallengeToken(result.challengeToken)
          return
        }
        setUser(result.user)
      }
      setRememberedUser(identity.id)
      await queryClient.invalidateQueries({ queryKey: authKeys.session })
      setSuccess(true)
      navigate(destination, { replace: true })
      window.setTimeout(() => unlockScreen(), 350)
    } catch (requestError) {
      if (challengeToken) setCode('')
      setError(
        requestError instanceof GlassAPIError
          ? requestError.message
          : mode === 'lock'
            ? 'The screen could not be unlocked.'
            : 'The login could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return {
    password,
    setPassword,
    code,
    setCode,
    challengeToken,
    error,
    submitting,
    success,
    submit,
  }
}
