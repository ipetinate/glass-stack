import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_AUTO_LOCK_MINUTES, useLockStore } from './lock'

describe('useLockStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useLockStore.setState({
      locked: false,
      rememberedUserId: null,
      autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
      selectedUserId: null,
    })
  })

  it('locks and unlocks the screen', () => {
    useLockStore.getState().lock()

    expect(useLockStore.getState().locked).toBe(true)

    useLockStore.getState().unlock()

    expect(useLockStore.getState().locked).toBe(false)
  })

  it('selects a user and resets the selection on lock', () => {
    useLockStore.getState().selectUser('user-1')

    expect(useLockStore.getState().selectedUserId).toBe('user-1')

    useLockStore.getState().lock()

    expect(useLockStore.getState().selectedUserId).toBe(null)
  })

  it('clears the selection and remembered user to show the picker', () => {
    useLockStore.setState({
      selectedUserId: 'user-1',
      rememberedUserId: 'user-2',
    })

    useLockStore.getState().showUserPicker()

    expect(useLockStore.getState()).toMatchObject({
      selectedUserId: null,
      rememberedUserId: null,
    })
  })

  it('remembers and forgets the signed-in user', () => {
    useLockStore.getState().setRememberedUser('user-1')

    expect(useLockStore.getState().rememberedUserId).toBe('user-1')

    useLockStore.getState().setRememberedUser(null)

    expect(useLockStore.getState().rememberedUserId).toBe(null)
  })

  it('restores a clean instance on reset', () => {
    useLockStore.setState({
      locked: true,
      rememberedUserId: 'user-1',
      autoLockMinutes: 5,
      selectedUserId: 'user-2',
    })

    useLockStore.getState().reset()

    expect(useLockStore.getState()).toMatchObject({
      locked: false,
      rememberedUserId: null,
      selectedUserId: null,
      autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
    })
  })

  it('persists lock state, remembered user and auto lock interval', () => {
    useLockStore.setState({
      locked: true,
      rememberedUserId: 'user-1',
      autoLockMinutes: 5,
    })

    expect(JSON.parse(localStorage.lock)).toMatchObject({
      state: {
        locked: true,
        rememberedUserId: 'user-1',
        autoLockMinutes: 5,
      },
    })
    expect(JSON.parse(localStorage.lock).state.selectedUserId).toBeUndefined()
  })
})
