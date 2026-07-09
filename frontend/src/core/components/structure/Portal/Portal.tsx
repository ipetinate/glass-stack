import type { ReactNode } from 'react'
import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { getOrCreatePortalElement } from './Portal.functions'

type PortalProps = {
  children: ReactNode
  selector?: string
}

export function Portal({ children, selector }: PortalProps) {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const { element, shouldRemoveOnUnmount } = getOrCreatePortalElement(selector)

    setPortalElement(element)

    return () => {
      setPortalElement(null)

      if (shouldRemoveOnUnmount && element.parentElement) {
        element.parentElement.removeChild(element)
      }
    }
  }, [selector])

  if (!portalElement) return null

  return createPortal(children, portalElement)
}
