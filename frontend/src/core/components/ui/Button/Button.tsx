import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '@/core/functions/class-name'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ children, className, size = 'md', ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/30 font-medium text-[#151A21]/80 shadow-sm backdrop-blur-md transition-colors hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/15 dark:bg-white/10 dark:text-white/90 dark:hover:bg-white/15',
        size === 'sm' ? 'min-h-9 px-3 text-sm' : size === 'lg' ? 'min-h-12 px-5 text-base' : 'min-h-10 px-4 text-sm',
        className,
      )}
    >
      {children}
    </button>
  )
}
