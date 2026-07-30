import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AvatarSelection } from '@/modules/auth/components/AvatarPicker'
import type { SetupPreferences } from '@/modules/auth/api/auth'
import type { Enrollment } from '../api/onboarding'

export type OnboardingStage =
  | 'welcome'
  | 'connect'
  | 'account'
  | 'theme'
  | 'mfa'
  | 'security'

type OnboardingState = {
  currentStage: OnboardingStage
  completedStages: OnboardingStage[]
  locale: SetupPreferences['locale']
  theme: 'light' | 'dark'
  bootstrapToken: string
  username: string
  displayName: string
  password: string
  confirmation: string
  avatar: AvatarSelection
  enrollment: Enrollment | null
  totpCode: string
  recoveryCodes: string[]
  error: string
  submitting: boolean
  setField: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void
  setStage: (stage: OnboardingStage) => void
  markCompleted: (stage: OnboardingStage) => void
  reset: () => void
}

const initialState = {
  currentStage: 'welcome' as OnboardingStage,
  completedStages: [] as OnboardingStage[],
  locale: 'pt-BR' as const,
  theme: 'dark' as const,
  bootstrapToken: '',
  username: '',
  displayName: '',
  password: '',
  confirmation: '',
  avatar: { presetId: 'default' } as AvatarSelection,
  enrollment: null,
  totpCode: '',
  recoveryCodes: [] as string[],
  error: '',
  submitting: false,
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setField: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
      setStage: (currentStage) => set({ currentStage, error: '' }),
      markCompleted: (stage) =>
        set((state) => ({
          completedStages: state.completedStages.includes(stage)
            ? state.completedStages
            : [...state.completedStages, stage],
        })),
      reset: () => set(initialState),
    }),
    {
      name: 'glassstack-onboarding',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentStage: state.currentStage,
        completedStages: state.completedStages,
        locale: state.locale,
        theme: state.theme,
        username: state.username,
        displayName: state.displayName,
        avatar: state.avatar,
      }),
    },
  ),
)

export function clearOnboardingSecrets() {
  useOnboardingStore.setState({
    bootstrapToken: '',
    password: '',
    confirmation: '',
    enrollment: null,
    totpCode: '',
    recoveryCodes: [],
  })
}
