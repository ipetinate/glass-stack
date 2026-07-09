import { useUnsplashWallpapers, type UnsplashWallpaper } from '@/lib/unsplash'
import { Skeleton } from '@/core/components/foundation/Skeleton'
import { useWallpaperSearchStore } from '@/core/stores/wallpaper-search'
import type { Wallpaper } from '@/core/stores/wallpaper'

import { developerUnsplashWallpaperSuggestionList } from './developerUnsplashWallpapers.constants'
import { WallpaperOptionCard } from './WallpaperOptionCard'

const wallpaperSearchIdeas = [
  'soft gradients',
  'misty mountains',
  'abstract glass',
  'night city',
  'northern lights',
]

type UnsplashWallpaperSearchProps = {
  onPreview: (wallpaper: Wallpaper) => void
  selectedWallpaper: Wallpaper
  onSelect: (wallpaper: UnsplashWallpaper) => void
}

export function UnsplashWallpaperSearch({
  onPreview,
  selectedWallpaper,
  onSelect,
}: UnsplashWallpaperSearchProps) {
  const search = useWallpaperSearchStore((state) => state.search)
  const setSearch = useWallpaperSearchStore((state) => state.setSearch)
  const { debouncedQuery, isConfigured, query } = useUnsplashWallpapers(search)
  const wallpapers = query.data?.pages?.flatMap((page) => page.wallpapers) ?? []
  const trimmedSearch = search.trim()
  const isWaitingForDebounce =
    trimmedSearch.length >= 3 && debouncedQuery !== trimmedSearch
  const shouldShowInitialSkeleton =
    (isWaitingForDebounce || query.isFetching) && wallpapers.length === 0

  if (!isConfigured) {
    return (
      <div className="rounded-xl border border-black/10 bg-white/35 p-4 text-sm text-[#151A21]/60 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
        Unsplash search is unavailable. Configure VITE_UNSPLASH_ACCESS_KEY to
        enable it.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex max-w-xl flex-col gap-2 text-sm font-semibold">
        Search Unsplash
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Mountains, abstract glass, city..."
          className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm font-normal outline-none transition-colors placeholder:text-[#151A21]/40 focus:border-sky-400 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-white/35"
        />
      </label>

      {trimmedSearch.length > 0 && trimmedSearch.length < 3 && (
        <p className="text-sm text-[#151A21]/55 dark:text-white/50">
          Type at least 3 characters to search.
        </p>
      )}

      {shouldShowInitialSkeleton && <UnsplashWallpaperSearchSkeleton />}

      {query.isError && (
        <p className="text-sm text-red-700 dark:text-red-300">
          Unable to load Unsplash wallpapers right now.
        </p>
      )}

      {debouncedQuery.length >= 3 &&
        !shouldShowInitialSkeleton &&
        wallpapers.length === 0 && (
          <UnsplashSearchEmptyState
            title="No wallpapers found"
            description="Try broader visual ideas that work well with glass surfaces."
            selectedWallpaper={selectedWallpaper}
            onIdeaSelect={setSearch}
            onPreview={onPreview}
            onSuggestionSelect={onSelect}
          />
        )}

      {trimmedSearch.length === 0 && !query.isFetching && (
        <UnsplashSearchEmptyState
          title="Find a background that gives the glass room to breathe"
          description="Calm contrast, soft light, and a little depth tend to work best behind the dashboard."
          selectedWallpaper={selectedWallpaper}
          onIdeaSelect={setSearch}
          onPreview={onPreview}
          onSuggestionSelect={onSelect}
        />
      )}

      {wallpapers.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-5">
            {wallpapers.map((wallpaper) => (
              <WallpaperOptionCard
                key={wallpaper.id}
                wallpaper={{
                  id: wallpaper.id,
                  title: wallpaper.description,
                  description: `Photo by ${wallpaper.authorName}`,
                  source: wallpaper.source,
                  background: `url("${wallpaper.wallpaperUrl}")`,
                  previewBackground: `url("${wallpaper.previewUrl}")`,
                  authorName: wallpaper.authorName,
                  authorUrl: wallpaper.authorUrl,
                  downloadLocation: wallpaper.downloadLocation,
                }}
                selected={selectedWallpaper.id === wallpaper.id}
                onSelect={() => onSelect(wallpaper)}
                onPreview={onPreview}
              />
            ))}
          </div>

          {query.hasNextPage && (
            <button
              type="button"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
              className="w-fit cursor-pointer rounded-lg border border-black/10 bg-white/45 px-4 py-2 text-sm font-semibold text-[#151A21] transition-colors hover:border-sky-400 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              {query.isFetchingNextPage ? 'Loading more...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function UnsplashWallpaperSearchSkeleton() {
  return (
    <div
      aria-label="Searching wallpapers"
      role="status"
      className="grid min-h-[35rem] grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-5"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`wallpaper-skeleton-${index}`}
          data-testid="wallpaper-skeleton-card"
          className="flex min-h-[16rem] flex-col gap-4 rounded-xl border border-black/10 bg-white/35 p-4 dark:border-white/10 dark:bg-white/5"
        >
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  )
}

function UnsplashSearchEmptyState({
  description,
  onIdeaSelect,
  onPreview,
  onSuggestionSelect,
  selectedWallpaper,
  title,
}: {
  description: string
  onIdeaSelect: (idea: string) => void
  onPreview: (wallpaper: Wallpaper) => void
  onSuggestionSelect: (wallpaper: UnsplashWallpaper) => void
  selectedWallpaper: Wallpaper
  title: string
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/35 p-4 text-sm dark:border-white/10 dark:bg-white/5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-2xl text-[#151A21]/60 dark:text-white/55">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {wallpaperSearchIdeas.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => onIdeaSelect(idea)}
            className="cursor-pointer rounded-full border border-black/10 bg-white/45 px-3 py-1 text-xs font-semibold text-[#151A21]/70 transition-colors hover:text-[#151A21] dark:border-white/10 dark:bg-white/10 dark:text-white/65 dark:hover:text-white"
          >
            {idea}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#151A21]/50 dark:text-white/45">
          Developer suggestions
        </h3>

        <div className="mt-3 flex flex-wrap gap-5">
          {developerUnsplashWallpaperSuggestionList.map((wallpaper) => (
            <WallpaperOptionCard
              key={wallpaper.id}
              wallpaper={{
                id: wallpaper.id,
                title: wallpaper.description,
                description: `Photo by ${wallpaper.authorName}`,
                source: wallpaper.source,
                background: `url("${wallpaper.wallpaperUrl}")`,
                previewBackground: `url("${wallpaper.previewUrl}")`,
                authorName: wallpaper.authorName,
                authorUrl: wallpaper.authorUrl,
                downloadLocation: wallpaper.downloadLocation,
              }}
              selected={selectedWallpaper.id === wallpaper.id}
              onSelect={() => onSuggestionSelect(wallpaper)}
              onPreview={onPreview}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
