import { describe, expect, it } from 'vitest'

import { routes } from './router'

describe('router', () => {
  it('keeps route errors inside the app content area', () => {
    const shellRoutes = routes.filter((route) => route.path !== '*')

    expect(shellRoutes.length).toBeGreaterThan(0)

    shellRoutes.forEach((route) => {
      route.children?.forEach((childRoute) => {
        expect(childRoute.errorElement).toBeDefined()
      })
    })
  })
})
