import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { render } from '@/test/test-utils'

import { OnboardingTimeline } from './OnboardingTimeline'

describe('OnboardingTimeline', () => {
  it('uses a small semantic icon for every onboarding stage', () => {
    const { container } = render(
      <OnboardingTimeline
        completed={[]}
        current="connect"
        onSelect={vi.fn()}
      />,
    )

    expect(container.querySelectorAll('svg.size-3')).toHaveLength(5)
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.queryByText('6')).not.toBeInTheDocument()
  })
})
