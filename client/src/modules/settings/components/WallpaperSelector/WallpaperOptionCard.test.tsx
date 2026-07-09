import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Wallpaper } from '@/core/stores/wallpaper'

import { WallpaperOptionCard } from './WallpaperOptionCard'

const imageWallpaper: Wallpaper = {
  id: 'image',
  title: 'Image wallpaper',
  description: 'Remote image',
  source: 'unsplash',
  background: 'url("https://images.unsplash.com/wallpaper")',
  previewBackground: 'url("https://images.unsplash.com/preview")',
}

const gradientWallpaper: Wallpaper = {
  id: 'gradient',
  title: 'Gradient wallpaper',
  description: 'Gradient',
  source: 'gradient',
  background: 'linear-gradient(red, blue)',
  previewBackground: 'linear-gradient(red, blue)',
}

describe('WallpaperOptionCard', () => {
  it('lazy loads image wallpapers and hides the skeleton after load', () => {
    const { container } = render(
      <WallpaperOptionCard
        wallpaper={imageWallpaper}
        onSelect={vi.fn()}
      />,
    )

    const image = container.querySelector('img')

    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('src', 'https://images.unsplash.com/preview')
    expect(screen.getByTestId('wallpaper-image-skeleton')).toBeInTheDocument()

    fireEvent.load(image!)

    expect(screen.queryByTestId('wallpaper-image-skeleton')).not.toBeInTheDocument()
  })

  it('keeps solid and gradient wallpapers as background previews', () => {
    render(
      <WallpaperOptionCard
        wallpaper={gradientWallpaper}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gradient wallpaper/ })).toBeInTheDocument()
  })

  it('selects from the card and previews only from the expand action', async () => {
    const user = userEvent.setup()
    const onPreview = vi.fn()
    const onSelect = vi.fn()

    render(
      <WallpaperOptionCard
        wallpaper={imageWallpaper}
        onPreview={onPreview}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Select Image wallpaper' }))

    expect(onSelect).toHaveBeenCalledWith(imageWallpaper)
    expect(onPreview).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Preview Image wallpaper/ }))

    expect(onPreview).toHaveBeenCalledWith(imageWallpaper)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
