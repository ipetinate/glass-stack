import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar } from './Avatar'

describe('Avatar', () => {
  it.each([
    ['sm', 'size-14'],
    ['md', 'size-[76px]'],
    ['lg', 'size-24'],
    ['xl', 'size-[116px]'],
  ] as const)('renders the %s size variant', (size, expectedClass) => {
    const { container } = render(<Avatar size={size} />)

    expect(container.firstChild).toHaveClass(expectedClass)
  })

  it('renders initials', () => {
    render(<Avatar initials="IP" size="lg" />)

    expect(screen.getByText('IP')).toBeInTheDocument()
    expect(screen.getByText('IP')).toHaveClass('size-24')
  })

  it('renders an image avatar', () => {
    render(<Avatar image="/avatar.png" size="md" />)

    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveAttribute(
      'src',
      '/avatar.png',
    )
    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveClass(
      'size-[76px]',
    )
  })

  it('renders an empty shell when no avatar data is available', () => {
    const { container } = render(<Avatar />)

    expect(container.firstChild).toHaveClass('size-[76px]', 'rounded-full')
  })

  it('prefers image and still allows fallback initials to be rendered', () => {
    render(<Avatar image="/avatar.png" initials="IP" />)

    expect(screen.getByRole('img', { name: 'Avatar' })).toBeInTheDocument()
    expect(screen.getByText('IP')).toBeInTheDocument()
  })
})
