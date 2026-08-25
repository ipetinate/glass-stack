import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { ApplicationsStore } from './ApplicationsStore'

function renderStore() {
  return renderWithRouter(
    <Routes>
      <Route path="/applications-store" element={<ApplicationsStore />} />
    </Routes>,
    { route: '/applications-store' },
  )
}

describe('ApplicationsStore', () => {
  it('renders the catalog from the mocked API', async () => {
    renderStore()

    expect(screen.getByRole('heading', { name: 'App Store' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Jellyfin icon/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Find an app…')).toBeInTheDocument()
  })

  it('filters applications by search', async () => {
    const user = userEvent.setup()
    renderStore()
    const input = await screen.findByPlaceholderText('Find an app…')

    await user.type(input, 'Nextcloud')

    expect(screen.getByText('Nextcloud')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Jellyfin icon/i })).not.toBeInTheDocument(),
    )
  })

  it('opens the application detail and returns to the catalog', async () => {
    const user = userEvent.setup()
    renderStore()

    const jellyfinButton = await screen.findByRole('button', { name: /Jellyfin icon/i })
    await user.click(jellyfinButton)

    const backButton = await screen.findByRole('button', { name: 'Back' })
    await waitFor(() => {
      expect(backButton).toHaveStyle({ pointerEvents: 'auto' })
    })
    expect(screen.getByRole('heading', { name: 'Jellyfin' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Requirements' })).toHaveTextContent('Storage')
    expect(screen.getByRole('region', { name: 'Reviews' })).toHaveTextContent('Eric E.')
    expect(screen.getByRole('region', { name: 'Technical details' })).toHaveTextContent('arm64')

    await user.click(backButton)
    await waitFor(() => expect(screen.getByPlaceholderText('Find an app…')).toBeInTheDocument())
  })

  it('starts a standard installation through MSW', async () => {
    const user = userEvent.setup()
    renderStore()

    const installButtons = await screen.findAllByRole('button', { name: 'Install' })
    await user.click(installButtons[0])

    expect(await screen.findByRole('status')).toHaveTextContent('Installation started.')
  })
})
