import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApplicationCard } from './ApplicationCard'

import type { ApplicationSummary } from '../types'

function buildApplication(overrides: Partial<ApplicationSummary> = {}): ApplicationSummary {
  return {
    id: 'jellyfin',
    name: 'Jellyfin',
    developer: 'Jellyfin Dev Team',
    description: 'Your media, your server, your way.',
    category: 'Multimedia',
    tags: ['Multimedia'],
    iconSrc: '',
    screenshots: [],
    rating: 4.8,
    downloads: '12.4k',
    status: 'available',
    ...overrides,
  }
}

describe('ApplicationCard', () => {
  it('installs and locks the button showing progress under it', async () => {
    const user = userEvent.setup()
    const onInstall = vi.fn()
    const { rerender } = render(
      <ApplicationCard
        application={buildApplication()}
        installing
        installProgress={42}
        onOpen={vi.fn()}
        onInstall={onInstall}
      />,
    )

    const installButton = screen.getByRole('button', { name: 'Installing…' })
    expect(installButton).toBeDisabled()
    await user.click(installButton)
    expect(onInstall).not.toHaveBeenCalled()

    const progressbar = screen.getByRole('progressbar', { name: 'Installing Jellyfin' })
    expect(progressbar).toHaveAttribute('aria-valuenow', '42')

    rerender(
      <ApplicationCard
        application={buildApplication()}
        installing
        installProgress={90}
        onOpen={vi.fn()}
        onInstall={onInstall}
      />,
    )
    expect(screen.getByRole('progressbar', { name: 'Installing Jellyfin' })).toHaveAttribute(
      'aria-valuenow',
      '90',
    )
  })

  it('shows no progress bar when not installing', () => {
    render(
      <ApplicationCard
        application={buildApplication()}
        installProgress={42}
        onOpen={vi.fn()}
        onInstall={vi.fn()}
      />,
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install' })).not.toBeDisabled()
  })
})