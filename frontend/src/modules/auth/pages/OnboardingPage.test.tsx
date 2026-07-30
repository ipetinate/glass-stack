import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { OnboardingPage } from './OnboardingPage'

const checkPasswordSafetyMock = vi.hoisted(() => vi.fn())

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth')
  return {
    ...actual,
    checkPasswordSafety: checkPasswordSafetyMock,
  }
})

describe('OnboardingPage', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/onboarding')
    checkPasswordSafetyMock.mockReset()
    checkPasswordSafetyMock.mockResolvedValue({ status: 'safe' })
  })

  it('opens a dedicated bootstrap step without changing the Figma welcome surface', async () => {
    const user = userEvent.setup()
    renderWithRouter(<OnboardingPage />, { route: '/onboarding' })

    expect(screen.getByRole('heading', { name: 'Glass Stack' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Bootstrap token')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Começar' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Conecte este navegador ao servidor',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Bootstrap token')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('moves from account creation to the two Figma theme choices', async () => {
    const user = userEvent.setup()
    renderWithRouter(<OnboardingPage />, { route: '/onboarding' })

    await user.click(screen.getByRole('button', { name: 'Começar' }))
    await user.type(
      await screen.findByLabelText('Bootstrap token'),
      'bootstrap-token',
    )
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.type(await screen.findByLabelText('username'), 'owner')
    await user.type(
      screen.getByLabelText('password'),
      'a secure visual password',
    )
    await user.type(
      screen.getByLabelText('confirm password'),
      'a secure visual password',
    )
    await user.click(screen.getByRole('button', { name: 'Próximo' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Qual variação de tema você prefere?',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Escuro' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'system' })).not.toBeInTheDocument()
  })

  it('does not leave account creation when the password is compromised', async () => {
    checkPasswordSafetyMock.mockResolvedValue({
      status: 'compromised',
      occurrences: 120,
    })
    const user = userEvent.setup()
    renderWithRouter(<OnboardingPage />, { route: '/onboarding' })

    await user.click(screen.getByRole('button', { name: 'Começar' }))
    await user.type(
      await screen.findByLabelText('Bootstrap token'),
      'bootstrap-token',
    )
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(await screen.findByLabelText('username'), 'owner')
    await user.type(screen.getByLabelText('password'), 'a compromised password')
    await user.type(
      screen.getByLabelText('confirm password'),
      'a compromised password',
    )

    expect(
      await screen.findByText(/encontrada em vazamentos conhecidos/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo' })).toBeDisabled()
    expect(
      screen.getByRole('heading', { name: 'Agora crie uma conta de acesso' }),
    ).toBeInTheDocument()
  })
})
