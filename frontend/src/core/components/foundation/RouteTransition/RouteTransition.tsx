import type { ReactNode } from 'react'

import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocation, useOutlet } from 'react-router'

export function RouteTransition() {
  const outlet = useOutlet()
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const previousRouteRef = useRef<{
    key: string
    outlet: ReactNode
  } | null>(null)
  const [exitingRoute, setExitingRoute] = useState<{
    key: string
    outlet: ReactNode
  } | null>(null)

  useLayoutEffect(() => {
    const previousRoute = previousRouteRef.current

    if (previousRoute && previousRoute.key !== location.pathname) {
      setExitingRoute(previousRoute)
    }

    previousRouteRef.current = {
      key: location.pathname,
      outlet,
    }
  }, [location.pathname, outlet])

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div className="h-full min-h-0 overflow-hidden">{outlet}</div>

      <AnimatePresence>
        {exitingRoute && (
          <motion.div
            key={exitingRoute.key}
            className="pointer-events-none absolute inset-0 z-50 h-full min-h-0 overflow-hidden"
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -6, scale: 0.996 }
            }
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.12 : 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => setExitingRoute(null)}
          >
            {exitingRoute.outlet}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
