import { act, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import {
  checkPasswordSafety,
  type PasswordSafetyResult,
} from '../../api/auth'
import { PasswordSafetyStatus } from './PasswordSafetyStatus'
import { usePasswordSafety } from './usePasswordSafety'

vi.mock('../../api/auth', () => ({
  checkPasswordSafety: vi.fn(),
}))

const checkPasswordSafetyMock = vi.mocked(checkPasswordSafety)

describe('usePasswordSafety', () => {
  beforeEach(() => {
    checkPasswordSafetyMock.mockReset()
  })

  it('checks a complete password and exposes the server assessment', async () => {
    checkPasswordSafetyMock.mockResolvedValue({
      status: 'compromised',
      occurrences: 23,
    })
    const { result } = renderHook(() =>
      usePasswordSafety('a compromised password phrase'),
    )

    await act(async () => {
      await result.current.check()
    })

    expect(result.current.assessment).toEqual({
      status: 'compromised',
      occurrences: 23,
    })
  })

  it('degrades to unavailable when the preview request fails', async () => {
    checkPasswordSafetyMock.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() =>
      usePasswordSafety('an offline password phrase'),
    )

    let assessment: PasswordSafetyResult | null = null
    await act(async () => {
      assessment = await result.current.check()
    })

    expect(assessment).toEqual({ status: 'unavailable' })
    expect(result.current.assessment).toEqual({ status: 'unavailable' })
  })

  it('does not call the server before the minimum length is met', async () => {
    const { result } = renderHook(() => usePasswordSafety('too short'))

    await act(async () => {
      expect(await result.current.check()).toBeNull()
    })

    expect(checkPasswordSafetyMock).not.toHaveBeenCalled()
  })
})

describe('PasswordSafetyStatus', () => {
  it('communicates a compromised result without relying on color', () => {
    renderWithRouter(
      <PasswordSafetyStatus
        assessment={{ status: 'compromised', occurrences: 12 }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Found in known data breaches (12 occurrences)',
    )
  })
})

