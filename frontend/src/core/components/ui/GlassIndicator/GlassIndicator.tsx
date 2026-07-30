import { cn } from '@/core/functions/class-name'

export function GlassIndicator({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <img
      src="/images/onboarding/glass-indicator.svg"
      alt=""
      aria-hidden="true"
      className={cn('object-contain', size === 'sm' ? 'size-6' : 'size-8', className)}
    />
  )
}
