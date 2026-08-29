import { AlertTriangle, KeyRound } from 'lucide-react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AccordionCard } from './AccordionCard'

describe('AccordionCard', () => {
  it('renders icon, title and description with a chevron', () => {
    render(
      <AccordionCard
        icon={<AlertTriangle data-testid="icon" />}
        title="Factory Reset"
        description="Erase all data"
      >
        content
      </AccordionCard>,
    )

    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Factory Reset')).toBeInTheDocument()
    expect(screen.getByText('Erase all data')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('hides the content when collapsed and reveals it on click', () => {
    render(
      <AccordionCard icon={<KeyRound />} title="Change password">
        <span>secret-field</span>
      </AccordionCard>,
    )

    const button = screen.getByRole('button')
    expect(screen.queryByText('secret-field')).not.toBeInTheDocument()

    fireEvent.click(button)

    expect(screen.getByText('secret-field')).toBeInTheDocument()
  })

  it('shows content immediately when defaultOpen and toggles aria-expanded', () => {
    render(
      <AccordionCard icon={<KeyRound />} title="Title" defaultOpen>
        <span>visible</span>
      </AccordionCard>,
    )

    const button = screen.getByRole('button')
    expect(screen.getByText('visible')).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('is disabled: ignores clicks, and the content stays hidden', () => {
    render(
      <AccordionCard icon={<KeyRound />} title="Title" disabled>
        <span>locked-content</span>
      </AccordionCard>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(screen.queryByText('locked-content')).not.toBeInTheDocument()
  })

  it('renders the lock icon instead of the chevron when disabled', () => {
    render(
      <AccordionCard icon={<KeyRound />} title="Title" disabled>
        content
      </AccordionCard>,
    )

    // The chevron (ChevronRight) belongs to a family named "ChevronRight",
    // the lock to "Lock". Verify via aria-hidden svg title-less icon.
    const svgs = document.querySelectorAll('svg')
    const rendered = Array.from(svgs).map((svg) => svg.getAttribute('aria-hidden'))
    const lockPresent = Array.from(svgs).some((svg) =>
      svg.outerHTML.includes('lucide-lock'),
    )
    expect(lockPresent).toBe(true)
    expect(rendered).toContain('true')
  })
})
