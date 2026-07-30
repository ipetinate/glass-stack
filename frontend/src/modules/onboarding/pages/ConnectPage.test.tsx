import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { useOnboardingStore } from '../stores/onboardingStore'
import { ConnectPage } from './ConnectPage'

describe('ConnectPage', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset()
  })

  it('copies the suggested bootstrap-token path', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    renderWithRouter(<ConnectPage />, { route: '/onboarding/connect' })

    await user.click(
      screen.getByRole('button', { name: 'Copiar caminho do token' }),
    )

    expect(writeText).toHaveBeenCalledWith(
      'GLASS_DATA_DIR/secrets/bootstrap-token',
    )
    expect(
      screen.getByRole('button', { name: 'Caminho copiado' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Caminho copiado para a área de transferência.'),
    ).toBeInTheDocument()
  })
})
