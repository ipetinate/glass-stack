import { describe, expect, it } from 'vitest'

import { DashboardPage } from './pages/DashboardPage/DashboardPage'
import { dashboardRoutes } from './routes'

describe('dashboardRoutes', () => {
  it('uses DashboardHomePage as the index route', () => {
    expect(dashboardRoutes).toHaveLength(1)
    expect(dashboardRoutes[0]).toMatchObject({ index: true })
    expect(dashboardRoutes[0].element).toEqual(<DashboardPage />)
  })
})
