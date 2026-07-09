import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Folder } from 'lucide-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWindowAppearanceStore } from '@/core/stores/window-appearance'

import { Window } from './Window'

describe('Window', () => {
  beforeEach(() => {
    useWindowAppearanceStore.setState({
      actionVisibility: {
        close: true,
        maximize: true,
        verticalExpand: true,
      },
      backgroundMode: 'solid',
    })
  })

  it('renders title, icon, actions, and children', () => {
    const { container } = render(
      <Window title="File Manager" icon={Folder} actions={<button>Pin</button>}>
        Files
      </Window>,
    )

    expect(
      screen.getByRole('heading', { name: 'File Manager' }),
    ).toBeInTheDocument()
    expect(container.querySelector('section')).toHaveClass(
      'min-h-0',
      'bg-[#EAF0F7]',
      'text-[#151A21]',
      'dark:bg-[#151A21]',
      'dark:text-white',
    )
    expect(container.querySelector('section')).not.toHaveClass('min-h-128')
    expect(screen.getByRole('button', { name: 'Pin' })).toBeInTheDocument()
    expect(screen.getByText('Files')).toBeInTheDocument()
  })

  it('hides maximize action when canMaximize is false', () => {
    render(<Window title="Terminal">Prompt</Window>)

    expect(
      screen.queryByRole('button', { name: 'Maximize window' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Expand window vertically' }),
    ).not.toBeInTheDocument()
  })

  it('toggles uncontrolled maximized state and calls action handlers', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onMaximize = vi.fn()
    const onMaximizedChange = vi.fn()

    const { container } = render(
      <Window
        title="Terminal"
        canMaximize
        onClose={onClose}
        onMaximize={onMaximize}
        onMaximizedChange={onMaximizedChange}
      >
        Prompt
      </Window>,
    )

    await user.click(screen.getByRole('button', { name: 'Maximize window' }))

    expect(container.querySelector('section')).toHaveAttribute(
      'data-maximized',
      'true',
    )
    expect(container.querySelector('section')).toHaveClass(
      'h-[calc(100dvh-3rem)]',
      'w-[calc(100vw-3rem)]',
    )
    expect(container.querySelector('section')).not.toHaveClass('h-full')
    expect(onMaximizedChange).toHaveBeenCalledWith(true)
    expect(onMaximize).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Restore window' }))

    expect(container.querySelector('section')).not.toHaveAttribute(
      'data-maximized',
    )
    expect(onMaximizedChange).toHaveBeenCalledWith(false)
    expect(onMaximize).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Close window' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggles vertical expansion without maximizing the window width', async () => {
    const user = userEvent.setup()
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    const { container } = render(
      <Window title="Settings" canMaximize>
        Content
      </Window>,
    )
    const section = container.querySelector('section')

    vi.spyOn(section as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      bottom: 520,
      height: 320,
      left: 700,
      right: 980,
      top: 200,
      width: 280,
      x: 700,
      y: 200,
      toJSON: () => ({}),
    })

    await user.click(
      screen.getByRole('button', { name: 'Expand window vertically' }),
    )

    expect(section).toHaveAttribute('data-vertical-expanded', 'true')
    expect(screen.queryByTestId('window-backdrop')).not.toBeInTheDocument()
    expect(section).toHaveClass('top-6', 'bottom-6')
    expect(section).toHaveStyle({
      left: '700px',
      width: '176px',
    })
    expect(section).not.toHaveAttribute('data-maximized')
    expect(section).not.toHaveClass('w-[calc(100vw-3rem)]')

    await user.click(screen.getByRole('button', { name: 'Restore vertical window' }))

    expect(section).not.toHaveAttribute('data-vertical-expanded')

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('supports controlled maximized state', async () => {
    const user = userEvent.setup()
    const onMaximizedChange = vi.fn()

    const { container } = render(
      <Window
        title="Terminal"
        canMaximize
        maximized
        onMaximizedChange={onMaximizedChange}
      >
        Prompt
      </Window>,
    )

    expect(container.querySelector('section')).toHaveAttribute(
      'data-maximized',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Restore window' }))

    expect(onMaximizedChange).toHaveBeenCalledWith(false)
    expect(container.querySelector('section')).toHaveAttribute(
      'data-maximized',
      'true',
    )
  })

  it('switches from maximized to vertical expansion in one action', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Window title="Terminal" canMaximize defaultMaximized>
        Prompt
      </Window>,
    )
    const section = container.querySelector('section')

    vi.spyOn(section as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      bottom: 760,
      height: 720,
      left: 24,
      right: 980,
      top: 24,
      width: 956,
      x: 24,
      y: 24,
      toJSON: () => ({}),
    })

    expect(section).toHaveAttribute('data-maximized', 'true')
    expect(screen.getByTestId('window-backdrop')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Expand window vertically' }),
    )

    expect(section).not.toHaveAttribute('data-maximized')
    expect(section).toHaveAttribute('data-vertical-expanded', 'true')
    expect(section).toHaveClass('top-6', 'bottom-6')
    expect(screen.queryByTestId('window-backdrop')).not.toBeInTheDocument()
  })

  it('uses blur background when configured', () => {
    useWindowAppearanceStore.setState({ backgroundMode: 'blur' })

    const { container } = render(<Window title="Settings">Content</Window>)

    expect(container.querySelector('section')).toHaveClass(
      'backdrop-blur-xl',
      'bg-white/58',
      'dark:bg-black/35',
    )
    expect(container.querySelector('section')).not.toHaveClass('bg-[#EAF0F7]')
  })

  it('hides configured window action buttons individually', () => {
    useWindowAppearanceStore.setState({
      actionVisibility: {
        close: false,
        maximize: false,
        verticalExpand: false,
      },
    })

    render(
      <Window title="Settings" canMaximize>
        Content
      </Window>,
    )

    expect(
      screen.queryByRole('button', { name: 'Expand window vertically' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Maximize window' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Close window' }),
    ).not.toBeInTheDocument()
  })
})
