import { cn } from '@/core/functions/class-name'

export function GlassIndicator({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-block rotate-45 rounded-[1px] border border-white/75 bg-gradient-to-br from-white/85 via-sky-100/60 to-sky-300/45 shadow-[0_3px_8px_rgb(7_21_37_/_0.28)] backdrop-blur-md',
        size === 'sm' ? 'size-4' : 'size-6',
        className,
      )}
    />
  )
}
