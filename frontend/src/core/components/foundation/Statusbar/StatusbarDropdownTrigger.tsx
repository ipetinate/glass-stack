import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { Portal } from '@/core/components/structure/Portal'
import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'

const POPOVER_GAP = 12
const POPOVER_MIN_WIDTH = 288
const POPOVER_VIEWPORT_MARGIN = 24

type StatusbarDropdownTriggerProps = {
  active: boolean
  align?: 'left' | 'right'
  children: ReactNode
  className?: string
  dropdown: ReactNode
  hideIndicator?: boolean
  label: string
  onClick: () => void
}

export function StatusbarDropdownTrigger({
  active,
  align = 'left',
  children,
  className = '',
  dropdown,
  hideIndicator = false,
  label,
  onClick,
}: StatusbarDropdownTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({})

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current

    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const top = rect.bottom + POPOVER_GAP

    if (align === 'right') {
      setPopoverStyle({
        minWidth: POPOVER_MIN_WIDTH,
        right: Math.max(
          POPOVER_VIEWPORT_MARGIN,
          window.innerWidth - rect.right,
        ),
        top,
      })

      return
    }

    setPopoverStyle({
      left: Math.min(
        Math.max(POPOVER_VIEWPORT_MARGIN, rect.left),
        window.innerWidth - POPOVER_MIN_WIDTH - POPOVER_VIEWPORT_MARGIN,
      ),
      minWidth: POPOVER_MIN_WIDTH,
      top,
    })
  }, [align])

  useLayoutEffect(() => {
    if (!active) return

    updatePopoverPosition()

    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)

    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [active, updatePopoverPosition])

  return (
    <div
      ref={triggerRef}
      className={['relative z-50 min-w-0', className].join(' ')}
    >
      <button
        type="button"
        aria-expanded={active}
        aria-label={label}
        onClick={onClick}
        className="group flex w-full min-w-0 cursor-pointer items-center justify-start gap-1 overflow-visible rounded-xl text-left transition-[filter,transform] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:scale-[0.99]"
      >
        <span className="inline-flex min-w-0 max-w-[calc(100%-1.25rem)] flex-none items-center">
          {children}
        </span>

        {hideIndicator || (
          <ChevronDown
            aria-hidden="true"
            className={[
              'size-4 shrink-0 text-[#151A21]/35 opacity-0 transition-all group-hover:translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-white/45',
              active ? 'translate-y-0.5 opacity-100' : '',
            ].join(' ')}
          />
        )}
      </button>

      {active && (
        <Portal selector="#statusbar-popover-root">
          <BackgroundBlur
            data-statusbar-popover="true"
            data-testid="statusbar-popover"
            className="fixed z-[9999] max-h-[min(70dvh,520px)] overflow-y-auto rounded-xl p-4 text-[#151A21] shadow-none isolation-auto transform-none dark:text-white"
            style={popoverStyle}
          >
            {dropdown}
          </BackgroundBlur>
        </Portal>
      )}
    </div>
  )
}
