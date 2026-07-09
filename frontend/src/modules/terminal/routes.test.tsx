import { describe, expect, it } from 'vitest'

import { TerminalPage } from './pages/TerminalPage'
import { terminalRoutes } from './routes'

describe('terminalRoutes', () => {
  it('uses TerminalPage as the index route', () => {
    expect(terminalRoutes).toHaveLength(1)
    expect(terminalRoutes[0]).toMatchObject({ index: true })
    expect(terminalRoutes[0].element).toEqual(<TerminalPage />)
  })
})
