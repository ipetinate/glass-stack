import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelReviewLogin,
  createReview,
  editInstalledApp,
  editReview,
  getApplication,
  getApplications,
  getInstalledApps,
  getReviewSession,
  removeInstalledApp,
  startApplicationInstall,
  startReviewLogin,
  syncStoreCatalog,
  updateInstalledApp,
} from '../api/applications'
import { useInstallOperations } from '../stores/install-operations'
import type {
  ApplicationSummary,
  InstallOperation,
  InstallRequest,
  InstalledApplication,
  InstallOptions,
  RemoveInstalledAppRequest,
} from '../types'

export const applicationsQueryKey = ['applications-store', 'applications']

const PAGE_SIZE = 20

export function useInfiniteApplications(filters?: { q?: string; category?: string; sort?: string }) {
  return useInfiniteQuery({
    queryKey: [...applicationsQueryKey, filters],
    queryFn: ({ pageParam }) =>
      getApplications({ ...filters, offset: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
  })
}

export function flattenPages(pages?: { data: ApplicationSummary[] }[]): ApplicationSummary[] {
  return pages?.flatMap((page) => page.data) ?? []
}

export function useApplication(appId: string | undefined) {
  return useQuery({
    queryKey: [...applicationsQueryKey, appId],
    queryFn: () => getApplication(appId!),
    enabled: Boolean(appId),
  })
}

export function useInstallApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: InstallRequest) => startApplicationInstall(request),
    onSuccess: (operation) => {
      useInstallOperations.getState().upsertOperation(operation)
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
}

export function useRemoveApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ appId, request }: { appId: string; request?: RemoveInstalledAppRequest }) =>
      removeInstalledApp(appId, request),
    onSuccess: (operation) => {
      useInstallOperations.getState().upsertOperation(operation)
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (appId: string) => updateInstalledApp(appId),
    onSuccess: (operation) => {
      useInstallOperations.getState().upsertOperation(operation)
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
}

export function useEditApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      appId,
      options,
    }: {
      appId: string
      options: InstallOptions
    }) => editInstalledApp(appId, 'custom', options),
    onSuccess: (operation) => {
      useInstallOperations.getState().upsertOperation(operation)
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
}

export function useActiveOperation(appId: string | undefined): InstallOperation | undefined {
  return useInstallOperations(
    (state) => (appId ? state.operations[appId] : undefined),
  )
}

export function useSyncCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => syncStoreCatalog(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
}

export function useCreateReview(appId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (review: { rating: number; comment: string }) => {
      if (!appId) throw new Error('No app selected.')
      return createReview(appId, review)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...applicationsQueryKey, appId],
      })
    },
  })
}

export function useEditReview(appId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { commentId: string; comment: string }) => {
      if (!appId) throw new Error('No app selected.')
      return editReview(appId, payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...applicationsQueryKey, appId],
      })
    },
  })
}

const reviewSessionQueryKey = ['applications-store', 'review-session']

export function useReviewSession(enabled: boolean) {
  return useQuery({
    queryKey: reviewSessionQueryKey,
    queryFn: getReviewSession,
    enabled,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 4000 : false,
  })
}

export function useStartReviewLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (provider: 'github' | 'google') => startReviewLogin(provider),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewSessionQueryKey })
    },
  })
}

export function useCancelReviewLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => cancelReviewLogin(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewSessionQueryKey })
    },
  })
}

const installedApplicationsQueryKey = [...applicationsQueryKey, 'installed']

export function useInstalledApplications() {
  return useQuery({
    queryKey: installedApplicationsQueryKey,
    queryFn: getInstalledApps,
    refetchInterval: 5000,
  })
}

export function useInstalledAppMap(): Map<string, InstalledApplication> {
  const query = useInstalledApplications()
  const apps = query.data?.data ?? []
  return new Map(apps.map((app) => [app.id, app]))
}

const catalogIconsQueryKey = [...applicationsQueryKey, 'catalog-icons']

export function useCatalogAppIcons() {
  return useQuery({
    queryKey: catalogIconsQueryKey,
    queryFn: async () => {
      const page = await getApplications({ limit: 1000 })
      const icons = new Map<string, string>()
      for (const application of page.data) {
        if (application.iconSrc) icons.set(application.id, application.iconSrc)
      }
      return icons
    },
    staleTime: 5 * 60 * 1000,
  })
}

