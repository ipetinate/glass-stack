import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelReviewLogin,
  createReview,
  getApplication,
  getApplications,
  getInstallOperation,
  getReviewSession,
  startApplicationInstall,
  startReviewLogin,
  syncStoreCatalog,
} from '../api/applications'
import type { ApplicationSummary, InstallRequest } from '../types'

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
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

export function useInstallOperation(operationId: string | undefined) {
  return useQuery({
    queryKey: [...applicationsQueryKey, 'install', operationId],
    queryFn: () => getInstallOperation(operationId!),
    enabled: Boolean(operationId),
    refetchInterval: (query) =>
      query.state.data?.status === 'installing' ? 1000 : false,
  })
}

