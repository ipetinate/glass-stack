import {
  QueryClient,
  type QueryClient as QueryClientInstance,
} from '@tanstack/react-query'
import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react'
import type { ReactElement } from 'react'

import { AppProviders } from '@/core/providers/AppProviders'

export type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClientInstance
}

export function customRender(
  ui: ReactElement,
  { queryClient, ...options }: CustomRenderOptions = {},
): RenderResult {
  return rtlRender(
    <AppProviders queryClient={queryClient}>{ui}</AppProviders>,
    options,
  )
}

export * from '@testing-library/react'
export { QueryClient, customRender as render }
