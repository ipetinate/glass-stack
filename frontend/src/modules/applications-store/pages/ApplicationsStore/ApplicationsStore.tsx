import { Search, ShoppingBag } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Input } from '@/core/components/form'
import { Window } from '@/core/components/foundation/Window'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'

import {
  ApplicationDetail,
  ApplicationFilters,
  ApplicationGrid,
  CustomInstallForm,
  FeaturedApplications,
  FilterTrigger,
  StoreSkeleton,
} from '../../components'
import {
  applicationsQueryKey,
  useApplication,
  useApplications,
  useInstallApplication,
  useInstallOperation,
} from '../../repositories'
import type { ApplicationSummary, InstallationMode } from '../../types'

import { getFeaturedApplications } from './ApplicationsStore.functions'

const EMPTY_APPLICATIONS: ApplicationSummary[] = []

export function ApplicationsStore() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmClose } = useUnsavedChanges({ scope: 'Applications Store' })
  const installMutation = useInstallApplication()
  const installOperationQuery = useInstallOperation(installMutation.data?.id)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('recent')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string>()
  const [customInstallOpen, setCustomInstallOpen] = useState(false)
  const [installingId, setInstallingId] = useState<string>()
  const [installationMode, setInstallationMode] = useState<InstallationMode>()
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in')
  const [showDetail, setShowDetail] = useState(false)
  const prevSelectedId = useRef<string | undefined>(undefined)
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined as never)

  const applicationsQuery = useApplications({ q: debouncedSearch, category, sort })
  const applications = applicationsQuery.data ?? EMPTY_APPLICATIONS
  const selectedSummary = applications.find((application) => application.id === selectedId)
  const selectedQuery = useApplication(selectedId)

  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceTimer.current)
  }, [search])

  const operation = installOperationQuery.data
  const isInstalling = installingId !== undefined && operation?.status === 'installing'
  const installProgress = operation?.status === 'installing' ? operation.progress : undefined

  useEffect(() => {
    if (operation?.status !== 'installed') return
    void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    const timeout = setTimeout(() => {
      setInstallingId(undefined)
      setInstallationMode(undefined)
      installMutation.reset()
    }, 1500)
    return () => clearTimeout(timeout)
  }, [operation?.status, queryClient, installMutation])

  const startInstall = (appId: string, mode: InstallationMode, options?: { port: number; volume: string }) => {
    setInstallingId(appId)
    setInstallationMode(mode)
    installMutation.mutate({ appId, mode, options })
  }

  const handleOpen = (appId: string) => {
    prevSelectedId.current = undefined
    setSlideDirection('in')
    setSelectedId(appId)
    setShowDetail(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShowDetail(true))
    })
  }

  const handleBack = () => {
    prevSelectedId.current = selectedId
    setSlideDirection('out')
    setShowDetail(false)
    setTimeout(() => {
      setSelectedId(undefined)
      setCustomInstallOpen(false)
      setInstallingId(undefined)
    }, 350)
  }

  const handleClose = () => {
    if (!confirmClose()) return
    navigate('/')
  }

  return (
    <Window
      title="App Store"
      icon={ShoppingBag}
      canMaximize
      onClose={handleClose}
      className="h-full"
      contentClassName="pt-6 overflow-hidden"
    >
      <div className="relative h-full min-h-0">
        {/* List view */}
        <div
          className="absolute inset-0 flex flex-col gap-5 transition-transform duration-300"
          style={{
            transform: showDetail ? 'translateX(-100%)' : 'translateX(0)',
            pointerEvents: showDetail ? 'none' : 'auto',
          }}
        >
          {applicationsQuery.isLoading ? <StoreSkeleton /> : null}
          {applicationsQuery.isError ? (
            <div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-5 text-sm text-rose-100">
              Could not load the app store.
            </div>
          ) : null}
          {!applicationsQuery.isLoading && !applicationsQuery.isError && applications.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <FeaturedApplications applications={getFeaturedApplications(applications)} onOpen={handleOpen} />
              <div className="relative border-b border-white/5 py-3">
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
                <ApplicationFilters
                  category={category}
                  sort={sort}
                  expanded={filtersExpanded}
                  onCategoryChange={setCategory}
                  onSortChange={setSort}
                />
              </div>
              <div className="pt-5">
                {applications.length > 0 ? (
                  <ApplicationGrid
                    applications={applications}
                    installingApplicationId={isInstalling ? installingId : undefined}
                    onOpen={handleOpen}
                    onInstall={(appId) => startInstall(appId, 'standard')}
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

        {/* Detail view */}
        {selectedId && selectedQuery.data ? (
          <div
            className="absolute inset-0 transition-transform duration-300"
            style={{
              transform: showDetail
                ? 'translateX(0)'
                : slideDirection === 'in'
                  ? 'translateX(100%)'
                  : 'translateX(100%)',
              pointerEvents: showDetail ? 'auto' : 'none',
            }}
          >
            <ApplicationDetail
              application={selectedQuery.data}
              onBack={handleBack}
              onInstall={() => startInstall(selectedId, 'standard')}
              onCustomInstall={() => {
                setCustomInstallOpen(true)
                setInstallationMode('custom')
              }}
              isInstalling={isInstalling && installingId === selectedId}
              installProgress={installingId === selectedId ? installProgress : undefined}
            />
          </div>
        ) : null}
      </div>

      {selectedSummary && customInstallOpen && selectedQuery.data ? (
        <CustomInstallForm
          application={selectedQuery.data}
          onCancel={() => setCustomInstallOpen(false)}
          onSubmit={(options) => {
            startInstall(selectedSummary.id, 'custom', options)
            setCustomInstallOpen(false)
          }}
        />
      ) : null}
      {installingId && installMutation.data ? (
        <div role="status" className="mt-4 shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          {installationMode === 'custom' ? 'Custom installation started.' : 'Installation started.'}{' '}
          {operation?.message ?? installMutation.data.message}
        </div>
      ) : null}
    </Window>
  )
}
