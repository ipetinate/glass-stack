import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { onboardingRoutes } from './routes'

function OnboardingTestRoutes() {
  return useRoutes(onboardingRoutes)
}

describe('onboarding route transitions', () => {
  it('keeps the previous route content stable while the next stage enters', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    queryClient.setQueryData(['auth', 'setup'], { required: true })
    const user = userEvent.setup()

    renderWithRouter(<OnboardingTestRoutes />, {
      queryClient,
      route: '/onboarding',
    })

    await user.click(screen.getByRole('button', { name: 'Começar' }))

    expect(screen.getByRole('heading', { name: 'Glass Stack' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Bootstrap token')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Etapas do onboarding' }),
    ).not.toBeInTheDocument()

    expect(await screen.findByLabelText('Bootstrap token')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Glass Stack' }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('onboarding-stage-transition')).toHaveAttribute(
      'data-transition-direction',
      'forward',
    )
    expect(
      screen.getByRole('navigation', { name: 'Etapas do onboarding' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByLabelText('Bootstrap token')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Glass Stack' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Etapas do onboarding' }),
    ).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { name: 'Glass Stack' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('onboarding-stage-transition')).toHaveAttribute(
      'data-transition-direction',
      'backward',
    )
    expect(
      screen.queryByRole('navigation', { name: 'Etapas do onboarding' }),
    ).not.toBeInTheDocument()
  })
})
