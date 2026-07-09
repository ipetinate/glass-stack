import { type ComponentPropsWithoutRef, type ReactNode, useId } from 'react'

interface GlassCheckboxProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type'
> {
  label?: ReactNode
}

export function GlassCheckbox({
  label,
  id,
  className = '',
  ...props
}: GlassCheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label
      htmlFor={inputId}
      className={`group flex cursor-pointer select-none items-center gap-3 text-sm text-[#151A21]/75 dark:text-white/90 ${className}`}
    >
      <span className="relative grid size-5 place-items-center">
        <input
          id={inputId}
          type="checkbox"
          className="peer sr-only"
          {...props}
        />

        <span
          className="
            absolute inset-0 rounded-lg
            border border-black/10
            bg-white/45
            shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_2px_8px_rgba(15,23,42,0.08)]
            backdrop-blur-md
            transition-all duration-200 ease-out

            group-hover:border-black/15
            group-hover:bg-white/60

            peer-focus-visible:outline-2
            peer-focus-visible:outline-offset-2
            peer-focus-visible:outline-cyan-300/70

            peer-checked:border-cyan-300/55
            peer-checked:bg-cyan-200/35
            peer-checked:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_8px_rgba(15,23,42,0.10)]

            dark:border-white/16
            dark:bg-white/8
            dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_10px_rgba(0,0,0,0.22)]

            dark:group-hover:border-white/24
            dark:group-hover:bg-white/12

            dark:peer-checked:border-cyan-200/45
            dark:peer-checked:bg-cyan-200/18
            dark:peer-checked:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_10px_rgba(0,0,0,0.28)]
          "
        />

        <svg
          viewBox="0 0 14 14"
          aria-hidden="true"
          className="
            relative size-3.5
            scale-75 opacity-0
            text-[#151A21]
            transition-all duration-200 ease-out
            peer-checked:scale-100
            peer-checked:opacity-100
            dark:text-white
          "
        >
          <path
            d="M3.1 7.15 5.75 9.8 10.9 4.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {label && (
        <span className="leading-none text-[#151A21]/75 group-hover:text-[#151A21] dark:text-white/90 dark:group-hover:text-white">
          {label}
        </span>
      )}
    </label>
  )
}
