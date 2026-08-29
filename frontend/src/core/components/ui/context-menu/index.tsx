import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export type ContextMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
}

type ContextMenuProps = {
  open: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', onClose)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose])

  if (!open) return null

  const menuWidth = 224
  const menuHeight = items.length * 34 + 12
  const left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8))
  const top = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="z-50 min-w-56 rounded-xl border border-white/10 bg-[#14161a]/95 p-1.5 shadow-2xl backdrop-blur-md"
      style={{ position: 'fixed', left, top }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            onClose()
            item.onSelect()
          }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            item.destructive
              ? 'text-rose-300 hover:bg-rose-500/15'
              : 'text-white/85 hover:bg-white/10'
          }`}
        >
          {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}