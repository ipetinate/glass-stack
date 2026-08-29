import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { useInstallOperations } from '../../stores/install-operations'

import { server } from '../../../../../test/mocks/server'

import { StoreDetail } from './StoreDetail'

function renderDetail(appId = 'jellyfin') {
  return renderWithRouter(
    <Routes>
      <Route path="/app-store" element={<div>Listing</div>} />
      <Route path="/app-store/:appId" element={<StoreDetail />} />
    </Routes>,
    { route: `/app-store/${appId}` },
  )
}

beforeEach(() => {
  useInstallOperations.setState({ operations: {} })
})

describe('StoreDetail', () => {
  it('renders application details', async () => {
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Jellyfin' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Requirements' })).toHaveTextContent('Storage')
    expect(screen.getByRole('region', { name: 'Reviews' })).toHaveTextContent('Eric E.')
    expect(screen.getByRole('region', { name: 'Technical details' })).toHaveTextContent('arm64')
  })

  it('shows uninstall and manage actions for installed apps', async () => {
    renderDetail()

    expect(await screen.findByRole('button', { name: 'Uninstall' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage application' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
  })

  it('navigates back to listing when clicking Back', async () => {
    const user = userEvent.setup()
    renderDetail()

    const backButton = await screen.findByRole('button', { name: 'Back' })
    await user.click(backButton)

    await waitFor(() => {
      expect(screen.getByText('Listing')).toBeInTheDocument()
    })
  })

  it('starts a standard installation through MSW', async () => {
    const user = userEvent.setup()
    renderDetail('nextcloud')

    const installButton = await screen.findByRole('button', { name: 'Install' })
    await user.click(installButton)

    await waitFor(() => {
      expect(installButton).toBeDisabled()
    })
  })

  it('shows an error alert when the install request fails', async () => {
    server.use(
      http.post('/api/v1/apps/install', () =>
        HttpResponse.json(
          { code: 'docker_unreachable', message: 'Docker indisponível no host.' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderDetail('nextcloud')

    const installButton = await screen.findByRole('button', { name: 'Install' })
    await user.click(installButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Docker indisponível no host.')
      expect(installButton).not.toBeDisabled()
    })
  })
})
