import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { useUnsavedChangesStore } from '@/core/stores/unsaved-changes/unsaved-changes'

import { Tabs, type TabItem } from './Tabs'

const tabs: TabItem[] = [
  {
    id: 'general',
    title: 'General',
    icon: 'Settings',
    content: <div>General content</div>,
  },
  {
    id: 'appearance',
    title: 'Appearence',
    icon: 'Palette',
    content: <div>Appearance content</div>,
  },
  {
    id: 'services',
    title: 'Services',
    icon: 'Server',
    content: <div>Services content</div>,
  },
]

describe('Tabs', () => {
  it('renders icon-name tabs and switches panels', async () => {
    const user = userEvent.setup()

    const { container } = render(<Tabs tabs={tabs} />)

    expect(container.querySelector('[role="tablist"]')).toHaveClass('pl-10')
    const tabPanel = container.querySelector('[role="tabpanel"]')

    expect(tabPanel).toHaveClass('overflow-hidden')
    expect(tabPanel?.firstElementChild).toHaveClass(
      'overflow-y-auto',
      'overflow-x-hidden',
      'overscroll-contain',
    )
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByText('General content')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Services' }))

    expect(screen.getByText('Services content')).toBeInTheDocument()
  })

  it('moves pinned tabs to the left by pin order', async () => {
    const user = userEvent.setup()

    render(<Tabs tabs={tabs} allowPin />)

    await user.click(screen.getByRole('button', { name: 'Pin Services' }))

    const renderedTabs = screen.getAllByRole('tab')

    expect(renderedTabs[0]).toHaveAccessibleName('Services')
  })

  it('asks before closing tabs with unsaved changes', async () => {
    const user = userEvent.setup()
    const onTabClose = vi.fn()

    vi.spyOn(window, 'confirm').mockReturnValue(false)
    useUnsavedChangesStore.getState().setUnsavedChanges('general-tab', true)

    render(
      <Tabs
        allowClose
        onTabClose={onTabClose}
        tabs={[
          {
            ...tabs[0],
            closeUnsavedChangesScope: 'general-tab',
          },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Close General' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(onTabClose).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
  })

  it('can render icon-only tabs', () => {
    render(<Tabs tabs={tabs} iconOnly />)

    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'General' })).toHaveClass('flex')
  })
})
