export type UnsplashWallpaper = {
  id: string
  description: string
  previewUrl: string
  wallpaperUrl: string
  authorName: string
  authorUrl: string
  blurHash?: string
  downloadLocation: string
  source: 'unsplash'
}

export type SearchUnsplashWallpapersParams = {
  query: string
  page?: number
}

export type SearchUnsplashWallpapersResult = {
  nextPage?: number
  page: number
  totalPages: number
  wallpapers: UnsplashWallpaper[]
}

export type UnsplashSearchResponse = {
  total_pages: number
  results: Array<{
    id: string
    alt_description: string | null
    blur_hash?: string | null
    description: string | null
    urls: {
      small: string
      regular: string
      raw: string
    }
    links: {
      download_location: string
    }
    user: {
      name: string
      links: {
        html: string
      }
    }
  }>
}
