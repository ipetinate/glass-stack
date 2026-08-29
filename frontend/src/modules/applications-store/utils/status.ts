import type {
  AppStatus,
  ApplicationSummary,
  InstalledApplication,
} from '../types'

export function toAppStatus(installed: InstalledApplication | undefined): AppStatus | undefined {
  if (!installed) return undefined
  switch (installed.status) {
    case 'installed':
      return 'installed'
    case 'error':
      return 'error'
    default:
      return 'installing'
  }
}

export function mergeInstalledStatus(
  application: ApplicationSummary,
  installedMap: Map<string, InstalledApplication>,
): ApplicationSummary {
  const status = toAppStatus(installedMap.get(application.id))
  if (!status) return application
  return { ...application, status }
}