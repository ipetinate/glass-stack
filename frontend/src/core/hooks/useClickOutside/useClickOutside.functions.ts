import type { RefObject } from 'react'

export type ClickOutsideEntry = {
  refs: RefObject<HTMLElement | null>[]
  onOutside: (event: PointerEvent) => void
  isInside?: (target: Node) => boolean
}

export const entries = new Set<ClickOutsideEntry>()
export let listenerAttached = false

export function handlePointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return

  for (const entry of entries) {
    const insideRef = entry.refs.some((ref) => ref.current?.contains(target))
    if (!insideRef && !entry.isInside?.(target)) entry.onOutside(event)
  }
}

export function attachListener() {
  if (listenerAttached || typeof document === 'undefined') return
  document.addEventListener('pointerdown', handlePointerDown, true)
  listenerAttached = true
}

export function detachListener() {
  if (!listenerAttached || typeof document === 'undefined') return
  document.removeEventListener('pointerdown', handlePointerDown, true)
  listenerAttached = false
}

export function getClickOutsideListenerCount() {
  return entries.size
}
