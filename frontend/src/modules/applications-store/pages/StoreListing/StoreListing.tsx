import { RefreshCw, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Input } from '@/core/components/form'

import {
  ApplicationFilters,
  FeaturedApplications,
  FilterTrigger,
  StoreSkeleton,
  VirtualizedApplicationGrid,
} from '../../components'
import {
  flattenPages,
  useInfiniteApplications,
  useInstallApplication,
  useInstalledAppMap,
  useSyncCatalog,
} from '../../repositories'
import { useInstallOperations } from '../../stores/install-operations'
import { mergeInstalledStatus } from '../../utils/status'

import { getFeaturedApplications } from './StoreListing.functions'

export function StoreListing() {
  const navigate = useNavigate()
  const syncMutation = useSyncCatalog()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('recent')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined as never)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const applicationsQuery = useInfiniteApplications({ q: debouncedSearch, category, sort })
  const applications = flattenPages(applicationsQuery.data?.pages)
  const installedAppMap = useInstalledAppMap()
  const mergedApplications = applications.map((application) =>
    mergeInstalledStatus(application, installedAppMap),
  )

  const installMutation = useInstallApplication()
  const failedOperation = useInstallOperations((state) =>
    Object.values(state.operations).find((operation) => operation.status === 'error'),
  )
  const installErrorMessage =
    failedOperation !== undefined
      ? failedOperation.message
      : installMutation.isError
        ? (installMutation.error?.message ?? 'Falha ao iniciar a instalação.')
        : undefined

  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceTimer.current)
  }, [search])

  const handleOpen = (appId: string) => {
    navigate(`/app-store/${appId}`)
  }

  const handleInstall = (appId: string) => {
    installMutation.mutate({ appId, mode: 'standard' })
  }

  return (
    <div className="relative h-full min-h-0">
      <div className="absolute inset-0 flex flex-col gap-5">
        {applicationsQuery.isLoading ? <StoreSkeleton /> : null}
        {applicationsQuery.isError ? (
          <div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-5 text-sm text-rose-100">
            Could not load the app store.
          </div>
        ) : null}
        {!applicationsQuery.isLoading && !applicationsQuery.isError && mergedApplications.length > 0 ? (
          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto">
            <FeaturedApplications applications={getFeaturedApplications(mergedApplications)} onOpen={handleOpen} />
            <div className="relative border-b border-white/5 py-3">
              <div className="flex items-center">
                <Input
                  aria-label="Search apps"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find an app…"
                  prepend={<Search className="size-4" />}
                  append={<FilterTrigger onClick={() => setFiltersExpanded((current) => !current)} expanded={filtersExpanded} />}
                  containerClassName="w-full"
                  className="text-white"
                />
                <button
                  type="button"
                  aria-label="Sync catalog"
                  title="Sync catalog"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className={syncMutation.isPending ? 'size-4 animate-spin' : 'size-4'} />
                </button>
              </div>
              <ApplicationFilters
                category={category}
                sort={sort}
                expanded={filtersExpanded}
                onCategoryChange={setCategory}
                onSortChange={setSort}
              />
            </div>
            <div className="pt-5">
              {installErrorMessage ? (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-100"
                >
                  Installation failed. {installErrorMessage}
                </div>
              ) : null}
              {mergedApplications.length > 0 ? (
                <VirtualizedApplicationGrid
                  applications={mergedApplications}
                  onOpen={handleOpen}
                  onInstall={handleInstall}
                  scrollContainerRef={scrollContainerRef}
                  hasNextPage={applicationsQuery.hasNextPage}
                  isFetchingNextPage={applicationsQuery.isFetchingNextPage}
                  fetchNextPage={() => void applicationsQuery.fetchNextPage()}
                />
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-sm text-white/60">
                  No apps found.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}