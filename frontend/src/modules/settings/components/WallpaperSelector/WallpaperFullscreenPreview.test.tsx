import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Wallpaper } from '@/core/stores/wallpaper'

import { WallpaperFullscreenPreview } from './WallpaperFullscreenPreview'

const wallpaper: Wallpaper = {
  id: 'unsplash',
  title: 'Glass mountain',
  description: 'Photo by Ada',
  source: 'unsplash',
  background: 'url("https://images.unsplash.com/wallpaper")',
  previewBackground: 'url("https://images.unsplash.com/preview")',
  authorName: 'Ada',
  authorUrl: 'https://unsplash.com/@ada',
}

describe('WallpaperFullscreenPreview', () => {
  it('opens fullscreen with credits and closes with Escape', () => {
    const onClose = vi.fn()
    const { container } = render(
      <WallpaperFullscreenPreview wallpaper={wallpaper} onClose={onClose} />,
    )

    const image = container.ownerDocument.querySelector('img')

    expect(screen.getByText('Glass mountain')).toBeInTheDocument()
    expect(screen.getByText(/Image courtesy of Unsplash/)).toBeInTheDocument()
    expect(screen.getByTestId('wallpaper-preview-window')).toHaveClass(
      'rounded-3xl',
      'overflow-hidden',
    )
    expect(image).toHaveAttribute('draggable', 'false')
    expect(image).toHaveClass('pointer-events-none', 'select-none')
    expect(document.body).toContainElement(
      screen.getByRole('button', { name: 'Close wallpaper preview' }),
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('minimizes and restores the credit widget', async () => {
    const user = userEvent.setup()

    render(<WallpaperFullscreenPreview wallpaper={wallpaper} onClose={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: 'Minimize wallpaper credits' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Show wallpaper credits' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show wallpaper credits' }))

    expect(
      await screen.findByRole('button', { name: 'Minimize wallpaper credits' }),
    ).toBeInTheDocument()
  })
})
