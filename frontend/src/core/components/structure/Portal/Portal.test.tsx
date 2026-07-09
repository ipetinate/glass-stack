import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Portal } from './Portal'

describe('Portal', () => {
  it('creates a missing target element and removes it on unmount', () => {
    const { unmount } = render(
      <Portal selector="#temporary-portal-root">
        <div>Portal content</div>
      </Portal>,
    )

    const portalRoot = document.querySelector('#temporary-portal-root')

    expect(portalRoot).toBeInTheDocument()
    expect(screen.getByText('Portal content')).toBeInTheDocument()

    unmount()

    expect(document.querySelector('#temporary-portal-root')).not.toBeInTheDocument()
  })

  it('reuses an existing target element without removing it on unmount', () => {
    const existingElement = document.createElement('div')
    existingElement.id = 'existing-portal-root'
    document.body.appendChild(existingElement)

    const { unmount } = render(
      <Portal selector="#existing-portal-root">
        <div>Existing root content</div>
      </Portal>,
    )

    expect(screen.getByText('Existing root content')).toBeInTheDocument()

    unmount()

    expect(document.querySelector('#existing-portal-root')).toBe(existingElement)

    existingElement.remove()
  })
})
