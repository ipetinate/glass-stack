import { describe, expect, it } from 'vitest'

import { StoreLayout } from '@/modules/applications-store/pages/StoreLayout'
import { applicationsStoreRoutes } from '@/modules/applications-store/routes'

describe('applicationsStoreRoutes', () => {
  it('has a layout route with children', () => {
    expect(applicationsStoreRoutes).toHaveLength(1)
    expect(applicationsStoreRoutes[0].element).toEqual(<StoreLayout />)
    expect(applicationsStoreRoutes[0].children).toHaveLength(2)
  })

  it('has an index route for the listing', () => {
    const children = applicationsStoreRoutes[0].children ?? []
    const indexRoute = children.find((route) => route.index)
    expect(indexRoute).toBeDefined()
  })

  it('has a detail route with appId param', () => {
    const children = applicationsStoreRoutes[0].children ?? []
    const detailRoute = children.find((route) => route.path === ':appId')
    expect(detailRoute).toBeDefined()
  })
})
