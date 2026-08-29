import { describe, expect, it } from 'vitest'
import { Navigate } from 'react-router'

import { SettingsPage } from './pages/SettingsPage'
import {
  DEFAULT_SETTINGS_TAB,
  settingsTabs,
  settingsTabRoutes,
} from './pages/SettingsPage/SettingsPage.tabs'
import { settingsRoutes } from './routes'

describe('settingsRoutes', () => {
  it('uses SettingsPage as the layout for the /settings route', () => {
    expect(settingsRoutes).toHaveLength(1)
    expect(settingsRoutes[0].path).toBe('/settings')
    expect(settingsRoutes[0].element).toEqual(<SettingsPage />)
  })

  it('redirects the index route to the default tab', () => {
    const children = settingsRoutes[0].children ?? []
    const indexRoute = children.find((route) => route.index === true)

    expect(indexRoute).toBeDefined()
    expect(indexRoute?.element?.type).toBe(Navigate)
  })

  it('declares one child route per settings tab, all backed by a component', () => {
    const children = settingsRoutes[0].children ?? []
    const tabRoutes = children.filter(
      (route) => route.path !== '*' && route.index !== true,
    )

    expect(tabRoutes).toHaveLength(settingsTabs.length)
    expect(Object.keys(settingsTabRoutes).sort()).toEqual(
      settingsTabs.map((tab) => tab.id).sort(),
    )
    expect(tabRoutes.some((route) => route.path === DEFAULT_SETTINGS_TAB)).toBe(
      true,
    )
  })

  it('falls back to the default tab for unknown sub-paths', () => {
    const children = settingsRoutes[0].children ?? []
    const fallback = children.find((route) => route.path === '*')

    expect(fallback).toBeDefined()
    expect(fallback?.element?.type).toBe(Navigate)
  })
})
