import { AppProviders } from '@/core/providers/AppProviders'
import { RouterProvider } from 'react-router'

import { router } from './router'

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
