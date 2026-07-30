import { useId } from 'react'

import { cn } from '@/core/functions/class-name'

const platePath = 'M45 10.5C48.1 8.7 51.9 8.7 55 10.5L87.5 29.2C91 31.2 91 34.8 87.5 36.8L55 55.5C51.9 57.3 48.1 57.3 45 55.5L12.5 36.8C9 34.8 9 31.2 12.5 29.2L45 10.5Z'

export function GlassIndicator({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const gradientId = useId().replaceAll(':', '')

  return (
    <svg
      aria-hidden="true"
      className={cn(
        'inline-block overflow-visible drop-shadow-[0_3px_5px_rgb(7_21_37_/_0.28)]',
        size === 'sm' ? 'h-4 w-6' : 'h-5 w-8',
        className,
      )}
      viewBox="0 0 100 70"
    >
      <defs>
        <linearGradient id={`${gradientId}-indicator`} x1="20" x2="78" y1="28" y2="68">
          <stop offset="0" stopColor="#F1FAFF" />
          <stop offset="1" stopColor="#9ED4F5" />
        </linearGradient>
      </defs>
      <path
        d={platePath}
        fill={`url(#${gradientId}-indicator)`}
        fillOpacity="0.9"
        stroke="#F4FBFF"
        strokeOpacity="0.95"
        strokeWidth="1.5"
        transform="rotate(-8 50 35)"
      />
    </svg>
  )
}
