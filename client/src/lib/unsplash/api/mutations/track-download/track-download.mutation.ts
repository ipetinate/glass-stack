import { getUnsplashAuthorizationHeader } from '../../queries'

export async function trackUnsplashDownloadMutation(downloadLocation: string) {
  const response = await fetch(downloadLocation, {
    headers: {
      Authorization: getUnsplashAuthorizationHeader(),
    },
  })

  if (!response.ok) {
    throw new Error('Unable to track Unsplash wallpaper selection.')
  }
}
