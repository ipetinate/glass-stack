import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'

import { cn } from '@/core/functions/class-name'

export type GlassStackLoaderSize =
  | 24
  | 32
  | 48
  | 64
  | 96
  | 128
  | 192
  | 256

export type GlassStackLoaderProps = {
  className?: string
  label?: string
  size?: GlassStackLoaderSize
}

const platePath =
  'M45 10.5C48.1 8.7 51.9 8.7 55 10.5L87.5 29.2C91 31.2 91 34.8 87.5 36.8L55 55.5C51.9 57.3 48.1 57.3 45 55.5L12.5 36.8C9 34.8 9 31.2 12.5 29.2L45 10.5Z'

const plateTransition = {
  duration: 1.35,
  ease: [0.34, 1.15, 0.64, 1] as const,
  repeat: Infinity,
  repeatDelay: 0.12,
  times: [0, 0.5, 1],
}

export function GlassStackLoader({
  className,
  label = 'Carregando…',
  size = 64,
}: GlassStackLoaderProps) {
  const shouldReduceMotion = useReducedMotion()
  const gradientId = useId().replaceAll(':', '')

  return (
    <span
      aria-label={label}
      className={cn('inline-flex shrink-0', className)}
      role="status"
      style={{ height: size, width: size }}
    >
      <svg
        aria-hidden="true"
        className="size-full overflow-visible"
        focusable="false"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id={`${gradientId}-bottom`} x1="20" x2="78" y1="28" y2="68">
            <stop offset="0" stopColor="#D9F1FF" />
            <stop offset="1" stopColor="#82C8F5" />
          </linearGradient>
          <linearGradient id={`${gradientId}-middle`} x1="20" x2="78" y1="20" y2="62">
            <stop offset="0" stopColor="#F1FAFF" />
            <stop offset="1" stopColor="#ACDAF6" />
          </linearGradient>
          <linearGradient id={`${gradientId}-top`} x1="18" x2="80" y1="12" y2="58">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#DDEFFC" />
          </linearGradient>
        </defs>

        <motion.g
          animate={shouldReduceMotion ? undefined : { y: [0, 5, 0] }}
          data-glass-stack-loader-layer="bottom"
          transition={shouldReduceMotion ? undefined : plateTransition}
        >
          <path
            d={platePath}
            fill={`url(#${gradientId}-bottom)`}
            fillOpacity="0.88"
            stroke="#EAF8FF"
            strokeOpacity="0.92"
            strokeWidth="1.5"
            transform="translate(0 30)"
          />
        </motion.g>

        <motion.g
          animate={shouldReduceMotion ? undefined : { y: [0, 0.75, 0] }}
          data-glass-stack-loader-layer="middle"
          transition={shouldReduceMotion ? undefined : plateTransition}
        >
          <path
            d={platePath}
            fill={`url(#${gradientId}-middle)`}
            fillOpacity="0.86"
            stroke="#F4FBFF"
            strokeOpacity="0.94"
            strokeWidth="1.5"
            transform="translate(0 15)"
          />
        </motion.g>

        <motion.g
          animate={shouldReduceMotion ? undefined : { y: [0, -5, 0] }}
          data-glass-stack-loader-layer="top"
          transition={shouldReduceMotion ? undefined : plateTransition}
        >
          <path
            d={platePath}
            fill={`url(#${gradientId}-top)`}
            fillOpacity="0.92"
            stroke="#FFFFFF"
            strokeOpacity="0.96"
            strokeWidth="1.5"
          />
        </motion.g>
      </svg>
    </span>
  )
}
