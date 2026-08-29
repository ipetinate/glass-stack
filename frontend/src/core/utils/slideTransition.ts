import type { Transition, Variants } from 'motion/react'

export type SlideDirection = -1 | 0 | 1

export const slideVariants: Variants = {
  enter: (direction: SlideDirection) => ({
    opacity: 0,
    x: direction * 40,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: SlideDirection) => ({
    opacity: 0,
    x: direction * -32,
  }),
}

export const slideTransition: Transition = {
  duration: 0.2,
  ease: [0.33, 1, 0.68, 1],
}
