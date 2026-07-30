import { useEffect } from 'react'
import { OnboardingShell } from '@/modules/onboarding/components/OnboardingShell'
import { useOnboardingStore } from '@/modules/onboarding/stores/onboardingStore'

/** @deprecated Use the dedicated onboarding module and nested routes. */
export function OnboardingPage() {
  const reset = useOnboardingStore((state) => state.reset)
  useEffect(() => {
    reset()
  }, [reset])
  return <OnboardingShell standalone />
}
