import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ComponentErrorBoundary } from './ComponentErrorBoundary'

function BrokenChild(): ReactNode {
  throw new Error('Broken child')
}

describe('ComponentErrorBoundary', () => {
  it('renders a local fallback when a child component throws', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    render(
      <ComponentErrorBoundary fallback={<div>Local fallback</div>}>
        <BrokenChild />
      </ComponentErrorBoundary>,
    )

    expect(screen.getByText('Local fallback')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})
