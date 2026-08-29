import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigate, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { useWallpaperSearchStore } from '@/core/stores/wallpaper-search'
import { renderWithRouter } from '@/test/renderWithRouter'

import { SettingsPage } from './SettingsPage'

function SettingsTestRoutes() {
  return (
    <Routes>
      <Route path="/settings" element={<SettingsPage />}>
        <Route index element={<Navigate to="appearance" replace />} />
        <Route path="general" element={<div>General content</div>} />
        <Route path="appearance" element={<div>Appearance content</div>} />
        <Route path="security" element={<div>Security content</div>} />
      </Route>
    </Routes>
  )
}

describe('SettingsPage', () => {
  it('renders the settings window with tabs', () => {
    renderWithRouter(<SettingsTestRoutes />, { route: '/settings/appearance' })

    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Services' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Pin General' }),
    ).not.toBeInTheDocument()
    // o painel renderiza o conteúdo da rota ativa via Outlet
    expect(screen.getByText('Appearance content')).toBeInTheDocument()
    expect(screen.queryByText('Security content')).not.toBeInTheDocument()
  })

  it('redirects the root /settings to the default tab', () => {
    renderWithRouter(<SettingsTestRoutes />, { route: '/settings' })

    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Appearance content')).toBeInTheDocument()
  })

  it('restores the active tab from the URL and switches content on click', async () => {
    const user = userEvent.setup()

    renderWithRouter(<SettingsTestRoutes />, { route: '/settings/security' })

    // a rota decide qual aba está ativa e qual conteúdo aparece
    expect(screen.getByRole('tab', { name: 'Security' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Security content')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'General' }))

    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('General content')).toBeInTheDocument()
    expect(screen.queryByText('Security content')).not.toBeInTheDocument()
  })

  it('clears wallpaper search and Unsplash cache when settings window is closed', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()

    useWallpaperSearchStore.getState().setSearch('jellyfish')
    queryClient.setQueryData(['unsplash-wallpapers', 'jellyfish'], {
      pages: [],
    })

    renderWithRouter(
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route index element={<Navigate to="appearance" replace />} />
          <Route path="appearance" element={<div>Appearance content</div>} />
        </Route>
      </Routes>,
      { route: '/settings/appearance', queryClient },
    )

    await user.click(screen.getByRole('button', { name: 'Close window' }))

    expect(useWallpaperSearchStore.getState().search).toBe('')
    expect(
      queryClient.getQueryData(['unsplash-wallpapers', 'jellyfish']),
    ).toBeUndefined()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
