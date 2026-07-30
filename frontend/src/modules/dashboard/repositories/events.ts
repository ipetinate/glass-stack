import { useEventSamplingStore } from '@/core/stores/event-sampling'
import type { DashboardEvent } from '@/modules/dashboard/api/queries'
import { streamEvents } from '@/modules/dashboard/api/queries'

import {
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query'

export function useEvents() {
  const { intervalSeconds } = useEventSamplingStore()

  return useQuery({
    queryKey: ['events', intervalSeconds],
    queryFn: streamedQuery({
      streamFn: ({ signal }) => streamEvents(signal, intervalSeconds),
      reducer: (events, event) => [...events.slice(-119), event],
      refetchMode: 'reset',
      initialValue: [] as DashboardEvent[],
    }),
  })
}
