import { unsplashConfig } from '../../../unsplash.config'
import type {
  SearchUnsplashWallpapersParams,
  UnsplashSearchResponse,
  UnsplashWallpaper,
} from '../../../unsplash.types'

const buildOptimizedWallpaperUrl = (rawUrl: string) => {
  const url = new URL(rawUrl)

  url.searchParams.set('w', String(unsplashConfig.wallpaperWidth))
  url.searchParams.set('fit', 'crop')
  url.searchParams.set('crop', 'entropy')
  url.searchParams.set('auto', 'format')
  url.searchParams.set('q', '80')

  return url.toString()
}

const appendAttributionParams = (url: string) => {
  const attributionUrl = new URL(url)

  attributionUrl.searchParams.set('utm_source', 'glass_stack')
  attributionUrl.searchParams.set('utm_medium', 'referral')

  return attributionUrl.toString()
}

const mapUnsplashWallpaper = (
  photo: UnsplashSearchResponse['results'][number],
): UnsplashWallpaper => ({
  id: photo.id,
  description: photo.alt_description ?? photo.description ?? 'Unsplash wallpaper',
  previewUrl: photo.urls.small,
  wallpaperUrl: buildOptimizedWallpaperUrl(photo.urls.raw),
  authorName: photo.user.name,
  authorUrl: appendAttributionParams(photo.user.links.html),
  blurHash: photo.blur_hash ?? undefined,
  downloadLocation: photo.links.download_location,
  source: 'unsplash',
})

export const getUnsplashAuthorizationHeader = () => {
  if (!unsplashConfig.accessKey) {
    throw new Error('Unsplash access key is not configured.')
  }

  return `Client-ID ${unsplashConfig.accessKey}`
}

export async function searchUnsplashWallpapersQuery({
  page = 1,
  query,
}: SearchUnsplashWallpapersParams) {
  const url = new URL('/search/photos', unsplashConfig.apiUrl)

  url.searchParams.set('query', query)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(unsplashConfig.perPage))
  url.searchParams.set('orientation', 'landscape')

  const response = await fetch(url, {
    headers: {
      Authorization: getUnsplashAuthorizationHeader(),
    },
  })

  if (!response.ok) {
    throw new Error('Unable to search Unsplash wallpapers.')
  }

  const data = (await response.json()) as UnsplashSearchResponse

  return {
    nextPage: page < data.total_pages ? page + 1 : undefined,
    page,
    totalPages: data.total_pages,
    wallpapers: data.results.map(mapUnsplashWallpaper),
  }
}
