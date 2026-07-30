import { cn } from '@/core/functions/class-name'

export function GlassIndicator({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-block border border-white/75 bg-gradient-to-br from-white/85 via-sky-100/60 to-sky-300/45 shadow-[0_3px_8px_rgb(7_21_37_/_0.28)] backdrop-blur-md [clip-path:polygon(18%_0,100%_0,82%_100%,0_100%)]',
        size === 'sm' ? 'h-3.5 w-6' : 'h-4.5 w-8',
        className,
      )}
    />
  )
}
