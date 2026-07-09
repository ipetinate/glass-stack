import { describe, expect, it } from 'vitest'

import { ApplicationsStore } from '@/modules/applications-store/pages/ApplicationsStore'
import { applicationsStoreRoutes } from '@/modules/applications-store/routes'

describe('applicationsStoreRoutes', () => {
  it('uses ApplicationsStore as the index route', () => {
    expect(applicationsStoreRoutes).toHaveLength(1)
    expect(applicationsStoreRoutes[0]).toMatchObject({ index: true })
    expect(applicationsStoreRoutes[0].element).toEqual(<ApplicationsStore />)
  })
})
