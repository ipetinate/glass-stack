import type { LucideIcon } from 'lucide-react'
import * as Icons from 'lucide-react'
import { Pin, PinOff, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import type { IconName } from '@/core/types'
import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { cn } from '@/core/functions/class-name'

export type TabTriggerProps = {
  id: string
  title: string
  icon?: IconName
  selected?: boolean
  pinned?: boolean
  allowClose?: boolean
  allowPin?: boolean
  iconOnly?: boolean
  onActivate: () => void
  onClose: () => void
  onPinChange: () => void
}

export function TabTrigger({
  id,
  title,
  icon,
  selected = false,
  pinned = false,
  allowClose = false,
  allowPin = false,
  iconOnly = false,
  onActivate,
  onClose,
  onPinChange,
}: TabTriggerProps) {
  const Icon = icon ? (Icons[icon] as LucideIcon) : null

  return (
    <div
      className={cn(
        'group relative flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-t-xl rounded-b-none px-5 text-sm font-semibold text-[#151A21]/65 transition-colors dark:text-white/75',
        selected
          ? 'text-[#151A21] dark:text-white'
          : 'hover:text-[#151A21] dark:hover:text-white',
        iconOnly ? 'w-14 justify-center px-0' : 'min-w-40 max-w-56',
      )}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <BackgroundBlur
            as={motion.div}
            aria-hidden="true"
            className="absolute inset-0 rounded-t-xl rounded-b-none border border-b-0 border-white/70 bg-white/68 shadow-none dark:border-transparent dark:bg-black/25"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      <button
        type="button"
        role="tab"
        aria-selected={selected}
        aria-controls={`${id}-panel`}
        id={`${id}-tab`}
        title={title}
        onClick={onActivate}
        className={cn(
          'relative z-10 flex min-w-0 flex-1 cursor-pointer items-center gap-2 bg-transparent text-inherit',
          iconOnly && 'justify-center',
        )}
      >
        {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
        {!iconOnly && <span className="truncate">{title}</span>}
      </button>

      {!iconOnly && allowPin && (
        <button
          type="button"
          aria-label={pinned ? `Unpin ${title}` : `Pin ${title}`}
          title={pinned ? 'Unpin' : 'Pin'}
          onClick={onPinChange}
          className="relative z-10 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-[#151A21]/50 transition-colors hover:bg-black/10 hover:text-[#151A21] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {pinned ? (
            <PinOff aria-hidden="true" className="size-3.5" />
          ) : (
            <Pin aria-hidden="true" className="size-3.5" />
          )}
        </button>
      )}

      {!iconOnly && allowClose && (
        <button
          type="button"
          aria-label={`Close ${title}`}
          title="Close"
          onClick={onClose}
          className="relative z-10 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-[#151A21]/50 transition-colors hover:bg-black/10 hover:text-[#151A21] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  )
}
