import type {
  ComponentPropsWithoutRef,
  ElementType,
  PropsWithChildren,
  Ref,
} from 'react'

import { cn } from '@/core/functions/class-name'

type BackgroundBlurProps<TElement extends ElementType = 'div'> =
  PropsWithChildren<{
    as?: TElement
    className?: string
    elementRef?: Ref<HTMLElement>
  }> &
    Omit<
      ComponentPropsWithoutRef<TElement>,
      'as' | 'className' | 'children' | 'ref'
    >

export function BackgroundBlur<TElement extends ElementType = 'div'>({
  as,
  children,
  className = '',
  elementRef,
  ...props
}: BackgroundBlurProps<TElement>) {
  const Component: ElementType = as ?? 'div'

  return (
    <Component
      ref={elementRef}
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border',
        'border-white/55 dark:border-white/10',
        'bg-white/58 dark:bg-black/35',
        'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit]',
        'before:bg-white/20 dark:before:bg-black/20',
        'before:backdrop-blur-xl before:backdrop-saturate-150',
        'before:transform-[translateZ(0)] before:backface-hidden',
        'transform-[translateZ(0)] backface-hidden',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
