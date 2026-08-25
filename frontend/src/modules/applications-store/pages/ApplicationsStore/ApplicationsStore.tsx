import { RefreshCw, Search, ShoppingBag } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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
  StoreSkeleton,
} from '../../components'
import { filterApplications } from '../../functions/filter-applications'
import {
  applicationsQueryKey,
  useApplication,
  useApplications,
  useInstallApplication,
  useInstallOperation,
  useSyncCatalog,
} from '../../repositories'
import type { ApplicationSummary, InstallationMode } from '../../types'

import { getFeaturedApplications } from './ApplicationsStore.functions'

const EMPTY_APPLICATIONS: ApplicationSummary[] = []

export function ApplicationsStore() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmClose } = useUnsavedChanges({ scope: 'Applications Store' })
  const applicationsQuery = useApplications()
  const installMutation = useInstallApplication()
  const installOperationQuery = useInstallOperation(installMutation.data?.id)
  const syncMutation = useSyncCatalog()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('recent')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string>()
  const [customInstallOpen, setCustomInstallOpen] = useState(false)
  const [installingId, setInstallingId] = useState<string>()
  const [installationMode, setInstallationMode] = useState<InstallationMode>()

  const applications = applicationsQuery.data ?? EMPTY_APPLICATIONS
  const selectedSummary = applications.find((application) => application.id === selectedId)
  const selectedQuery = useApplication(selectedId)
  const visibleApplications = useMemo(
    () => filterApplications(applications, search, category, sort),
    [applications, category, search, sort],
  )

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

  const handleClose = () => {
    if (!confirmClose()) return
    navigate('/')
  }

  return (
    <Window
      title="Loja de aplicativos"
      icon={ShoppingBag}
      canMaximize
      onClose={handleClose}
      className="h-full"
      contentClassName="pt-6"
    >
      {selectedId && selectedQuery.data ? (
        <ApplicationDetail
          application={selectedQuery.data}
          onBack={() => {
            setSelectedId(undefined)
            setCustomInstallOpen(false)
            setInstallingId(undefined)
          }}
          onInstall={() => startInstall(selectedId, 'standard')}
          onCustomInstall={() => {
            setCustomInstallOpen(true)
            setInstallationMode('custom')
          }}
          isInstalling={isInstalling && installingId === selectedId}
          installProgress={installingId === selectedId ? installProgress : undefined}
        />
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
          {applicationsQuery.isLoading ? <StoreSkeleton /> : null}
          {applicationsQuery.isError ? (
            <div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-5 text-sm text-rose-100">
              Não foi possível carregar a loja de aplicativos.
            </div>
          ) : null}
          {!applicationsQuery.isLoading && !applicationsQuery.isError && applications.length > 0 ? (
            <>
              <FeaturedApplications applications={getFeaturedApplications(applications)} onOpen={setSelectedId} />
              <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center">
                <Input
                  aria-label="Buscar aplicativos"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Encontre um aplicativo…"
                  prepend={<Search className="size-4" />}
                  containerClassName="min-w-0 flex-1"
                  className="text-white"
                />
                <ApplicationFilters
                  category={category}
                  sort={sort}
                  expanded={filtersExpanded}
                  onCategoryChange={setCategory}
                  onSortChange={setSort}
                  onToggle={() => setFiltersExpanded((current) => !current)}
                />
                <button
                  type="button"
                  aria-label="Atualizar catálogo"
                  title="Atualizar catálogo"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors hover:border-cyan-300/60 hover:text-cyan-300 disabled:opacity-50"
                >
                  <RefreshCw className={syncMutation.isPending ? 'size-4 animate-spin' : 'size-4'} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {visibleApplications.length > 0 ? (
                  <ApplicationGrid
                    applications={visibleApplications}
                    installingApplicationId={isInstalling ? installingId : undefined}
                    onOpen={setSelectedId}
                    onInstall={(appId) => startInstall(appId, 'standard')}
                  />
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-sm text-white/60">
                    Nenhum aplicativo encontrado.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
      {selectedSummary && customInstallOpen ? (
        <CustomInstallForm
          onCancel={() => setCustomInstallOpen(false)}
          onSubmit={(options) => {
            startInstall(selectedSummary.id, 'custom', options)
            setCustomInstallOpen(false)
          }}
        />
      ) : null}
      {installingId && installMutation.data ? (
        <div role="status" className="mt-4 shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          {installationMode === 'custom' ? 'Instalação customizada iniciada.' : 'Instalação iniciada.'}{' '}
          {operation?.message ?? installMutation.data.message}
        </div>
      ) : null}
    </Window>
  )
}
