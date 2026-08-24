import { ApplicationCard } from './ApplicationCard'
import type { ApplicationSummary } from '../types'

type ApplicationGridProps = {
  applications: ApplicationSummary[]
  installingApplicationId?: string
  onOpen: (applicationId: string) => void
  onInstall: (applicationId: string) => void
}

export function ApplicationGrid({
  applications,
  installingApplicationId,
  onOpen,
  onInstall,
}: ApplicationGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 pb-5 xl:grid-cols-2">
      {applications.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          installing={installingApplicationId === application.id}
          onOpen={onOpen}
          onInstall={onInstall}
        />
      ))}
    </div>
  )
}
