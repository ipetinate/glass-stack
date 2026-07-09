const DEFAULT_PORTAL_ID = 'app-portal-root'

/**
 * Builds a stable DOM node for a selector when the app has not rendered one yet.
 * Existing nodes are always reused and never removed by the Portal component.
 */
export function getOrCreatePortalElement(selector = `#${DEFAULT_PORTAL_ID}`) {
  const existingElement = document.querySelector<HTMLElement>(selector)

  if (existingElement) {
    return {
      element: existingElement,
      shouldRemoveOnUnmount: false,
    }
  }

  const element = document.createElement('div')

  applySelectorIdentity(element, selector)
  document.body.appendChild(element)

  return {
    element,
    shouldRemoveOnUnmount: true,
  }
}

function applySelectorIdentity(element: HTMLElement, selector: string) {
  if (selector.startsWith('#')) {
    element.id = selector.slice(1)
    return
  }

  if (selector.startsWith('.')) {
    element.className = selector.slice(1)
    return
  }

  element.dataset.portalRoot = selector
}
