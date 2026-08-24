import type { ApplicationSummary } from '../../types'

export function getFeaturedApplications(applications: ApplicationSummary[]) {
  return applications.slice(0, 2)
}

