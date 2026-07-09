import type { Wallpaper } from '@/core/stores/wallpaper'

type SelectedWallpaperDetailsProps = {
  wallpaper: Wallpaper
}

export function SelectedWallpaperDetails({
  wallpaper,
}: SelectedWallpaperDetailsProps) {
  return (
    <aside className="flex min-w-60 flex-1 flex-col gap-3 rounded-xl border border-black/10 bg-white/35 p-4 text-sm dark:border-white/10 dark:bg-white/5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#151A21]/45 dark:text-white/45">
        Selected background
      </span>

      <h2 className="text-lg font-semibold">{wallpaper.title}</h2>
      <p className="text-[#151A21]/60 dark:text-white/55">{wallpaper.description}</p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-sky-400/15 px-2 py-1 text-sky-700 dark:text-sky-200">
          {wallpaper.source}
        </span>
        {wallpaper.source === 'unsplash' && (
          <span className="rounded-full bg-white/50 px-2 py-1 text-[#151A21]/60 dark:bg-white/10 dark:text-white/60">
            Optimized to 1920px
          </span>
        )}
      </div>

      {wallpaper.source === 'unsplash' && wallpaper.authorName && (
        <div className="mt-2 border-t border-black/10 pt-3 dark:border-white/10">
          <p className="text-xs text-[#151A21]/50 dark:text-white/45">Photo by</p>
          <a
            href={wallpaper.authorUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300"
          >
            {wallpaper.authorName} on Unsplash
          </a>
        </div>
      )}
    </aside>
  )
}
