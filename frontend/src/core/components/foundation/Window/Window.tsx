import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  type HTMLMotionProps,
  useAnimate,
  useReducedMotion,
} from 'motion/react'

import { Maximize2, Minimize2, UnfoldVertical, X } from 'lucide-react'

import { cn } from '@/core/functions/class-name'
import { useWindowAppearanceStore } from '@/core/stores/window-appearance'

const WINDOW_VIEWPORT_GAP = 24

export type WindowProps = Omit<
  HTMLMotionProps<'section'>,
  'children' | 'title'
> & {
  title: string
  icon?: LucideIcon
  actions?: ReactNode
  canMaximize?: boolean
  defaultMaximized?: boolean
  maximized?: boolean
  onClose?: () => void
  onMaximize?: () => void
  onMaximizedChange?: (maximized: boolean) => void
  children?: ReactNode
  contentClassName?: string
}

export function Window({
  title,
  icon: Icon,
  actions,
  canMaximize = false,
  defaultMaximized = false,
  maximized,
  onClose,
  onMaximize,
  onMaximizedChange,
  children,
  className,
  contentClassName,
  style,
  ...props
}: WindowProps) {
  const previousRectRef = useRef<DOMRect | null>(null)
  const animationCycleRef = useRef(0)
  const [scope, animate] = useAnimate<HTMLElement>()
  const [uncontrolledMaximized, setUncontrolledMaximized] =
    useState(defaultMaximized)
  const [isVerticallyExpanded, setIsVerticallyExpanded] = useState(false)
  const [verticalExpansionStyle, setVerticalExpansionStyle] =
    useState<CSSProperties | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const { actionVisibility, backgroundMode } = useWindowAppearanceStore()
  const isMaximized = maximized ?? uncontrolledMaximized
  const [isBackdropVisible, setIsBackdropVisible] = useState(isMaximized)
  const WindowActionIcon = isMaximized ? Minimize2 : Maximize2

  useEffect(() => {
    if (isMaximized) {
      setIsBackdropVisible(true)
    }
  }, [isMaximized])

  useLayoutEffect(() => {
    const windowElement = scope.current

    if (!windowElement) return

    animationCycleRef.current += 1
    const animationCycle = animationCycleRef.current
    const nextRect = windowElement.getBoundingClientRect()
    const previousRect = previousRectRef.current

    previousRectRef.current = nextRect

    if (
      shouldReduceMotion ||
      !previousRect ||
      previousRect.width === 0 ||
      previousRect.height === 0 ||
      nextRect.width === 0 ||
      nextRect.height === 0
    ) {
      if (!isMaximized) {
        setIsBackdropVisible(false)
      }

      return
    }

    windowElement.style.height = `${nextRect.height}px`
    windowElement.style.left = `${nextRect.left}px`
    windowElement.style.margin = '0'
    windowElement.style.position = 'fixed'
    windowElement.style.top = `${nextRect.top}px`
    windowElement.style.width = `${nextRect.width}px`
    windowElement.style.zIndex = '50'

    void animate(
      windowElement,
      {
        height: [`${previousRect.height}px`, `${nextRect.height}px`],
        left: [`${previousRect.left}px`, `${nextRect.left}px`],
        top: [`${previousRect.top}px`, `${nextRect.top}px`],
        width: [`${previousRect.width}px`, `${nextRect.width}px`],
      },
      {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      },
    ).then(() => {
      if (animationCycleRef.current !== animationCycle) return

      windowElement.style.height = ''
      windowElement.style.left =
        isVerticallyExpanded && !isMaximized
          ? String(verticalExpansionStyle?.left ?? '')
          : ''
      windowElement.style.margin = ''
      windowElement.style.position = ''
      windowElement.style.top = ''
      windowElement.style.width =
        isVerticallyExpanded && !isMaximized
          ? String(verticalExpansionStyle?.width ?? '')
          : ''
      windowElement.style.zIndex = ''

      if (!isMaximized) {
        setIsBackdropVisible(false)
      }
    })
  }, [
    animate,
    isMaximized,
    isVerticallyExpanded,
    scope,
    shouldReduceMotion,
    verticalExpansionStyle,
  ])

  const handleMaximize = () => {
    previousRectRef.current = scope.current?.getBoundingClientRect() ?? null
    setIsVerticallyExpanded(false)
    setVerticalExpansionStyle(null)

    const nextMaximized = !isMaximized

    if (nextMaximized) {
      setIsBackdropVisible(true)
    }

    if (maximized === undefined) {
      setUncontrolledMaximized(nextMaximized)
    }

    onMaximizedChange?.(nextMaximized)

    if (nextMaximized) {
      onMaximize?.()
    }
  }

  const handleVerticalExpand = () => {
    const currentRect = scope.current?.getBoundingClientRect() ?? null

    previousRectRef.current = currentRect

    const nextExpanded = !isVerticallyExpanded

    if (nextExpanded && currentRect) {
      const availableWidth =
        window.innerWidth - currentRect.left - WINDOW_VIEWPORT_GAP

      setVerticalExpansionStyle({
        left: `${currentRect.left}px`,
        width: `${Math.max(Math.min(currentRect.width, availableWidth), 0)}px`,
      })
    }

    if (!nextExpanded) {
      setVerticalExpansionStyle(null)
    }

    if (isMaximized) {
      if (maximized === undefined) {
        setUncontrolledMaximized(false)
      }

      onMaximizedChange?.(false)
    }

    setIsVerticallyExpanded(nextExpanded)
  }

  return (
    <>
      <AnimatePresence>
        {isBackdropVisible && (
          <motion.div
            aria-hidden="true"
            data-testid="window-backdrop"
            className="pointer-events-none fixed inset-0 z-40 bg-black"
            initial={false}
            animate={{ opacity: isMaximized ? 0.26 : 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.42,
              ease: 'linear',
            }}
          />
        )}
      </AnimatePresence>

      <motion.section
        ref={scope}
        className={cn(
          'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]',
          backgroundMode === 'solid'
            ? 'border-black/5 bg-[#EAF0F7] text-[#151A21] dark:border-white/5 dark:bg-[#151A21] dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.36)]'
            : 'isolate border-white/55 bg-white/58 text-[#151A21] backdrop-blur-xl backdrop-saturate-150 shadow-none will-change-[backdrop-filter,background-color] [transform:translateZ(0)] dark:border-white/10 dark:bg-black/35 dark:text-white dark:shadow-none',
          className,
          isMaximized &&
            'fixed left-6 top-6 z-50 h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] min-h-0 w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)]',
          isVerticallyExpanded &&
            !isMaximized &&
            'fixed bottom-6 top-6 z-50 min-h-0 max-h-[calc(100dvh-3rem)]',
        )}
        data-maximized={isMaximized ? 'true' : undefined}
        data-vertical-expanded={isVerticallyExpanded ? 'true' : undefined}
        style={{
          ...style,
          ...(!isMaximized && isVerticallyExpanded
            ? (verticalExpansionStyle ?? undefined)
            : undefined),
        }}
        {...props}
      >
        <header className="flex h-6 shrink-0 items-center gap-2.5">
          {Icon && (
            <Icon aria-hidden="true" className="size-5 stroke-1 shrink-0" />
          )}

          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold leading-none">
            {title}
          </h2>

          {actions}

          {canMaximize && (
            <>
              {actionVisibility.verticalExpand && (
                <button
                  type="button"
                  aria-label={
                    isVerticallyExpanded
                      ? 'Restore vertical window'
                      : 'Expand window vertically'
                  }
                  aria-pressed={isVerticallyExpanded}
                  title={
                    isVerticallyExpanded ? 'Restore vertical' : 'Expand vertical'
                  }
                  onClick={handleVerticalExpand}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#151A21] transition-colors hover:bg-black/10 dark:text-white dark:hover:bg-white/10"
                >
                  <UnfoldVertical
                    aria-hidden="true"
                    className="size-5 stroke-1"
                  />
                </button>
              )}

              {actionVisibility.maximize && (
                <button
                  type="button"
                  aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
                  aria-pressed={isMaximized}
                  title={isMaximized ? 'Restore' : 'Maximize'}
                  onClick={handleMaximize}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#151A21] transition-colors hover:bg-black/10 dark:text-white dark:hover:bg-white/10"
                >
                  <WindowActionIcon
                    aria-hidden="true"
                    className="size-5 stroke-1"
                  />
                </button>
              )}
            </>
          )}

          {actionVisibility.close && (
            <button
              type="button"
              aria-label="Close window"
              title="Close"
              onClick={onClose}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#151A21] transition-colors hover:bg-black/10 dark:text-white dark:hover:bg-white/10"
            >
              <X aria-hidden="true" className="size-5 stroke-1" />
            </button>
          )}
        </header>

        <div
          className={cn(
            'min-h-0 flex-1 overflow-hidden pt-10',
            contentClassName,
          )}
        >
          {children}
        </div>
      </motion.section>
    </>
  )
}
