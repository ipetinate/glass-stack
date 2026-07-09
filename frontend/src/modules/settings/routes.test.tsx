import { describe, expect, it } from 'vitest'

import { SettingsPage } from './pages/SettingsPage'
import { settingsRoutes } from './routes'

describe('settingsRoutes', () => {
  it('uses SettingsPage as the index route', () => {
    expect(settingsRoutes).toHaveLength(1)
    expect(settingsRoutes[0]).toMatchObject({ index: true })
    expect(settingsRoutes[0].element).toEqual(<SettingsPage />)
  })
})
