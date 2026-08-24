import { describe, expect, it } from 'vitest'

import { routes } from './router'

describe('router', () => {
  it('keeps route errors inside the app content area', () => {
    const nestedRoutes = routes.flatMap((route) => route.children ?? [])

    expect(nestedRoutes.length).toBeGreaterThan(0)

    const shellRoute = nestedRoutes.find((route) =>
      route.children?.some((childRoute) => childRoute.path === '/'),
    )

    expect(shellRoute).toBeDefined()
    expect(shellRoute?.children?.length).toBeGreaterThan(0)

    shellRoute?.children?.forEach((childRoute) => {
      expect(childRoute.errorElement).toBeDefined()
    })
  })
})
