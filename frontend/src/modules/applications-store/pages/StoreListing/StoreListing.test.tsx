import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { useInstallOperations } from '../../stores/install-operations'

import { server } from '../../../../../test/mocks/server'

import { StoreListing } from './StoreListing'

function renderStore() {
  return renderWithRouter(
    <Routes>
      <Route path="/app-store" element={<StoreListing />} />
    </Routes>,
    { route: '/app-store' },
  )
}

beforeEach(() => {
  useInstallOperations.setState({ operations: {} })
})

describe('StoreListing', () => {
  it('renders the catalog from the mocked API', async () => {
    renderStore()

    expect(await screen.findAllByText('Jellyfin')).toHaveLength(2)
    expect(screen.getByPlaceholderText('Find an app…')).toBeInTheDocument()
  })

  it('filters applications by search', async () => {
    const user = userEvent.setup()
    renderStore()
    const input = await screen.findByPlaceholderText('Find an app…')

    await user.type(input, 'Nextcloud')

    expect(screen.getByText('Nextcloud')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText('Jellyfin')).not.toBeInTheDocument(),
    )
  })

  it('marks installed apps and locks the install button with a progress bar', async () => {
    const user = userEvent.setup()
    renderStore()

    expect(await screen.findByRole('button', { name: 'Installed' })).toBeDisabled()

    const installButton = (await screen.findAllByRole('button', { name: 'Install' }))[0]
    await user.click(installButton)

    expect(screen.getByRole('button', { name: 'Installing…' })).toBeDisabled()
    const progressbar = await screen.findByRole('progressbar', { name: /^Installing / })
    expect(Number(progressbar.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
  })

  it('shows an error alert when the install request fails and unlocks the button', async () => {
    server.use(
      http.post('/api/v1/apps/install', () =>
        HttpResponse.json(
          { code: 'docker_unreachable', message: 'Docker indisponível no host.' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderStore()

    const installButton = (await screen.findAllByRole('button', { name: 'Install' }))[0]
    await user.click(installButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Docker indisponível no host.')
    })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Install' })[0]).not.toBeDisabled()
    })
  })
})
