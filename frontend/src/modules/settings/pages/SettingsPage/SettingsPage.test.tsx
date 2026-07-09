import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/core/providers/AppProviders'
import { useWallpaperSearchStore } from '@/core/stores/wallpaper-search'
import { renderWithRouter } from '@/test/renderWithRouter'

import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('renders the settings window with tabs', () => {
    renderWithRouter(
      <AppProviders>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppProviders>,
      { route: '/settings' },
    )

    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Appearance' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Services' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Pin General' }),
    ).not.toBeInTheDocument()
  })

  it('clears wallpaper search and Unsplash cache when settings window is closed', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()

    useWallpaperSearchStore.getState().setSearch('jellyfish')
    queryClient.setQueryData(['unsplash-wallpapers', 'jellyfish'], {
      pages: [],
    })

    renderWithRouter(
      <AppProviders queryClient={queryClient}>
        <Routes>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppProviders>,
      { route: '/settings' },
    )

    await user.click(screen.getByRole('button', { name: 'Close window' }))

    expect(useWallpaperSearchStore.getState().search).toBe('')
    expect(
      queryClient.getQueryData(['unsplash-wallpapers', 'jellyfish']),
    ).toBeUndefined()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
