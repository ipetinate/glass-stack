import { useEffect, useRef, type RefObject } from 'react'

import {
  attachListener,
  detachListener,
  entries,
  type ClickOutsideEntry,
} from '@/core/hooks/useClickOutside/useClickOutside.functions'

export type UseClickOutsideOptions = {
  enabled?: boolean
  refs?: RefObject<HTMLElement | null>[]
  isInside?: (target: Node) => boolean
}

/**
 * Registers a single shared pointer listener only while an outside-aware surface is open.
 */
export function useClickOutside<T extends HTMLElement>(
  onOutside: (event: PointerEvent) => void,
  options: UseClickOutsideOptions = {},
) {
  const targetRef = useRef<T>(null)
  const callbackRef = useRef(onOutside)
  const refsRef = useRef<RefObject<HTMLElement | null>[]>([])
  const insideRef = useRef<((target: Node) => boolean) | undefined>(undefined)
  callbackRef.current = onOutside

  const enabled = options.enabled ?? true
  refsRef.current = options.refs ?? []
  insideRef.current = options.isInside

  useEffect(() => {
    if (!enabled) return
    const entry: ClickOutsideEntry = {
      refs: [targetRef, ...refsRef.current],
      onOutside: (event) => callbackRef.current(event),
      isInside: (target) => insideRef.current?.(target) ?? false,
    }
    entries.add(entry)
    attachListener()
    return () => {
      entries.delete(entry)
      if (entries.size === 0) detachListener()
    }
  }, [enabled])

  return targetRef
}
