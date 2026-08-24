import './core/styles/global.css'
import './core/styles/tailwind.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App.tsx'

async function bootstrap() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_APP_STORE_MOCKS === 'true') {
    const { worker } = await import('../test/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  createRoot(document.getElementById('app')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
