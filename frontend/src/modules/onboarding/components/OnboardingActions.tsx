import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react'

export type OnboardingAction = {
  label: string
  disabled?: boolean
  type?: 'button' | 'submit'
  form?: string
  onClick?: () => void
}

type OnboardingActionsContextValue = {
  setAction: (action: OnboardingAction | null) => void
}

export const OnboardingActionsContext = createContext<OnboardingActionsContextValue | null>(null)

export function OnboardingActionsProvider({
  setAction,
  children,
}: OnboardingActionsContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ setAction }), [setAction])

  return (
    <OnboardingActionsContext.Provider value={value}>
      {children}
    </OnboardingActionsContext.Provider>
  )
}

/** Registers the action rendered by the shell footer for the current stage. */
export function useOnboardingAction(action: OnboardingAction | null) {
  const context = useContext(OnboardingActionsContext)
  const setAction = context?.setAction

  useLayoutEffect(() => {
    if (!setAction) return
    setAction(action)
  }, [setAction, action?.label, action?.disabled, action?.type, action?.form, action?.onClick])
}
