import type { ReactNode } from 'react'

type InputActionButtonProps = {
  action: () => void | Promise<void>
  ariaLabel: string
  icon: ReactNode
}

export function InputActionButton({
  action,
  ariaLabel,
  icon,
}: InputActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => void action()}
      className="relative grid size-9 shrink-0 place-items-center rounded-lg text-[#151A21]/55 transition-colors hover:bg-black/5 hover:text-[#151A21] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {icon}
    </button>
  )
}
