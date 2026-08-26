import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import { ApplicationCard } from './ApplicationCard'
import type { ApplicationSummary } from '../types'

type VirtualizedApplicationGridProps = {
  applications: ApplicationSummary[]
  installingApplicationId?: string
  onOpen: (applicationId: string) => void
  onInstall: (applicationId: string) => void
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
}

const ROW_HEIGHT = 200
const GAP = 16
const COLUMNS = 2

export function VirtualizedApplicationGrid({
  applications,
  installingApplicationId,
  onOpen,
  onInstall,
  scrollContainerRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: VirtualizedApplicationGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [canVirtualize, setCanVirtualize] = useState(false)

  useEffect(() => {
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setCanVirtualize(true)
    }
  }, [scrollContainerRef])

  useEffect(() => {
    if (!sentinelRef.current || !fetchNextPage || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: scrollContainerRef.current, rootMargin: '200px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, scrollContainerRef])

  if (!canVirtualize) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            installing={installingApplicationId === application.id}
            onOpen={onOpen}
            onInstall={onInstall}
          />
        ))}
        <div ref={sentinelRef} className="h-px" />
      </div>
    )
  }

  return <VirtualizedGrid
    applications={applications}
    installingApplicationId={installingApplicationId}
    onOpen={onOpen}
    onInstall={onInstall}
    scrollContainerRef={scrollContainerRef}
    sentinelRef={sentinelRef}
    isFetchingNextPage={isFetchingNextPage}
  />
}

function VirtualizedGrid({
  applications,
  installingApplicationId,
  onOpen,
  onInstall,
  scrollContainerRef,
  sentinelRef,
  isFetchingNextPage,
}: {
  applications: ApplicationSummary[]
  installingApplicationId?: string
  onOpen: (applicationId: string) => void
  onInstall: (applicationId: string) => void
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  sentinelRef: React.RefObject<HTMLDivElement | null>
  isFetchingNextPage?: boolean
}) {
  const virtualizer = useVirtualizer({
    count: applications.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    gap: GAP,
    lanes: COLUMNS,
    overscan: 2,
  })

  return (
    <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const application = applications[virtualRow.index]
        if (!application) return null
        const column = virtualRow.lane % COLUMNS
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute w-1/2"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
              left: column === 0 ? 0 : '50%',
              paddingLeft: column === 1 ? GAP / 2 : 0,
              paddingRight: column === 0 ? GAP / 2 : 0,
            }}
          >
            <ApplicationCard
              application={application}
              installing={installingApplicationId === application.id}
              onOpen={onOpen}
              onInstall={onInstall}
            />
          </div>
        )
      })}
      <div ref={sentinelRef} className="h-px" />
      {isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      ) : null}
    </div>
  )
}
