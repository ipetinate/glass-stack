import { describe, expect, it } from 'vitest'

import { FileManagerPage } from './pages/FileManagerPage'
import { fileManagerRoutes } from './routes'

describe('fileManagerRoutes', () => {
  it('uses FileManagerPage as the index route', () => {
    expect(fileManagerRoutes).toHaveLength(1)
    expect(fileManagerRoutes[0]).toMatchObject({ index: true })
    expect(fileManagerRoutes[0].element).toEqual(<FileManagerPage />)
  })
})
