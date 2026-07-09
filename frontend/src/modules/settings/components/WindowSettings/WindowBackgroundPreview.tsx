import type { WindowBackgroundMode } from '@/core/stores/window-appearance'

import { cn } from '@/core/functions/class-name'

type WindowBackgroundPreviewProps = {
  mode: WindowBackgroundMode
}

export function WindowBackgroundPreview({ mode }: WindowBackgroundPreviewProps) {
  const isSolid = mode === 'solid'

  return (
    <span
      aria-hidden="true"
      className="relative block h-28 overflow-hidden rounded-lg border border-black/10 bg-[linear-gradient(135deg,#A9D8FF_0%,#EFD2FF_48%,#F7D0B4_100%)] p-3 dark:border-white/10 dark:bg-[linear-gradient(135deg,#08111f_0%,#43316d_48%,#0a2730_100%)]"
    >
      <span className="absolute left-4 top-4 size-10 rounded-full bg-sky-300/55 blur-xl dark:bg-cyan-400/35" />
      <span className="absolute bottom-4 right-4 size-14 rounded-full bg-pink-300/45 blur-xl dark:bg-fuchsia-500/30" />

      <span
        className={cn(
          'relative z-10 flex h-full flex-col gap-3 overflow-hidden rounded-lg border px-4 py-3',
          isSolid
            ? 'border-black/10 bg-[#EAF0F7] text-[#151A21] dark:border-white/10 dark:bg-[#151A21] dark:text-white'
            : 'border-white/70 bg-white/50 text-[#151A21] backdrop-blur-xl dark:border-white/10 dark:bg-black/35 dark:text-white',
        )}
      >
        <span
          className={cn(
            'h-4 w-20 rounded-full',
            isSolid
              ? 'bg-[#151A21]/16 dark:bg-white/18'
              : 'bg-white/70 shadow-sm dark:bg-white/22',
          )}
        />

        <span
          className={cn(
            'mt-auto h-10 rounded-lg',
            isSolid
              ? 'bg-white/75 shadow-sm dark:bg-black/22'
              : 'bg-white/48 shadow-sm dark:bg-white/12',
          )}
        />
      </span>
    </span>
  )
}
