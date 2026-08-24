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

    expect(screen.getByRole('heading', { name: 'Loja de aplicativos' })).toBeInTheDocument()
    expect((await screen.findAllByRole('button', { name: /Jellyfin ícone/i })).length).toBe(2)
    expect(screen.getByPlaceholderText('Encontre um aplicativo…')).toBeInTheDocument()
  })

  it('filters applications by search', async () => {
    const user = userEvent.setup()
    renderStore()
    const input = await screen.findByPlaceholderText('Encontre um aplicativo…')

    await user.type(input, 'Nextcloud')

    expect(screen.getByText('Nextcloud')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Jellyfin ícone/i })).toHaveLength(1)
  })

  it('opens the application detail and returns to the catalog', async () => {
    const user = userEvent.setup()
    renderStore()

    const jellyfinButtons = await screen.findAllByRole('button', { name: /Jellyfin ícone/i })
    await user.click(jellyfinButtons[0])

    expect(await screen.findByRole('heading', { name: 'Jellyfin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Voltar/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Voltar/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('Encontre um aplicativo…')).toBeInTheDocument())
  })

  it('starts a standard installation through MSW', async () => {
    const user = userEvent.setup()
    renderStore()

    const installButtons = await screen.findAllByRole('button', { name: 'Instalar' })
    await user.click(installButtons[0])

    expect(await screen.findByRole('status')).toHaveTextContent('Instalação iniciada')
  })
})
