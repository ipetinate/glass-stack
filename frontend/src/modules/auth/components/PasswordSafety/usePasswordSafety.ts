import { useCallback, useEffect, useRef, useState } from 'react'

import {
  checkPasswordSafety,
  type PasswordSafetyResult,
} from '../../api/auth'

export type PasswordSafetyState =
  | { status: 'idle' }
  | { status: 'checking' }
  | PasswordSafetyResult

const idleState: PasswordSafetyState = { status: 'idle' }

export function usePasswordSafety(password: string) {
  const [assessment, setAssessment] =
    useState<PasswordSafetyState>(idleState)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    requestRef.current?.abort()
    requestRef.current = null
    setAssessment(idleState)
  }, [password])

  useEffect(
    () => () => {
      requestRef.current?.abort()
    },
    [],
  )

  const check = useCallback(async (): Promise<PasswordSafetyResult | null> => {
    if (Array.from(password.normalize('NFC')).length < 8) {
      return null
    }

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setAssessment({ status: 'checking' })

    try {
      const result = await checkPasswordSafety(password, controller.signal)
      if (requestRef.current === controller) {
        setAssessment(result)
        requestRef.current = null
      }
      return result
    } catch {
      if (controller.signal.aborted) {
        return null
      }
      const unavailable: PasswordSafetyResult = { status: 'unavailable' }
      if (requestRef.current === controller) {
        setAssessment(unavailable)
        requestRef.current = null
      }
      return unavailable
    }
  }, [password])

  return {
    assessment,
    check,
    isChecking: assessment.status === 'checking',
    isCompromised: assessment.status === 'compromised',
  }
}
