import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useEventSamplingStore } from '@/core/stores/event-sampling'
import { useStatusbarStore } from '@/core/stores/statusbar'
import { useThemeStore } from '@/core/stores/theme'
import {
  defaultWallpaper,
  useWallpaperStore,
  wallpaperPresets,
} from '@/core/stores/wallpaper'
import { useWindowAppearanceStore } from '@/core/stores/window-appearance'
import { useAppStore } from '@/core/stores/app'
import type { SetupPreferences } from '@/modules/auth/api/auth'
import { useWeatherStore } from '@/lib/weather'

import {
  getPreferences,
  getWallpaper,
  preferenceKeys,
  updatePreferences,
} from '../../api/preferences'

export function PreferencesSync() {
  const queryClient = useQueryClient()
  const initialized = useRef(false)
  const revision = useRef(1)
  const pending = useRef<number | undefined>(undefined)
  const query = useQuery({
    queryKey: preferenceKeys.current,
    queryFn: getPreferences,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!query.data || initialized.current) return
    const record = query.data
    const user = useAppStore.getState().user
    if (user) useAppStore.getState().setUser({ ...user, avatarUrl: record.preferences.avatarUrl, avatarPresetId: record.preferences.avatarPresetId })
    revision.current = record.revision
    useThemeStore.getState().setTheme(record.preferences.theme)
    useWindowAppearanceStore.setState({
      backgroundMode: record.preferences.windowAppearance.backgroundMode,
      actionVisibility: record.preferences.windowAppearance.actionVisibility,
    })
    useEventSamplingStore
      .getState()
      .setIntervalSeconds(record.preferences.eventSamplingSeconds)

    const statusbar = record.preferences.statusbar
    if (statusbar) {
      useStatusbarStore.setState({
        clockVariant: statusbar.clock.variant,
        hourVariant: statusbar.clock.hourFormat,
        showDate: statusbar.clock.showDate,
        showWeekday: statusbar.clock.showWeekday,
        showMonth: statusbar.clock.showMonth,
        showYear: statusbar.clock.showYear,
      })
      useWeatherStore.setState({
        showCondition: statusbar.weather.showCondition,
        showGreeting: statusbar.weather.showGreeting,
        showIcon: statusbar.weather.showIcon,
      })
    }

    const preset =
      wallpaperPresets.find(
        (candidate) => candidate.id === record.preferences.wallpaperId,
      ) ?? null
    if (preset) {
      useWallpaperStore.getState().setWallpaper(preset)
    } else if (record.preferences.wallpaperId) {
      void getWallpaper(record.preferences.wallpaperId)
        .then(({ asset, wallpaper }) => {
          const source = asset
            ? `/api/v1/wallpapers/${encodeURIComponent(wallpaper.id)}/media`
            : wallpaper.sourceUrl
          if (!source) return
          useWallpaperStore.getState().setWallpaper({
            id: wallpaper.id,
            title: wallpaper.title,
            description: wallpaper.description,
            source: wallpaper.source === 'upload' ? 'upload' : 'unsplash',
            background: `url("${source}")`,
            previewBackground: `url("${source}")`,
            authorName: wallpaper.authorName,
            authorUrl: wallpaper.authorUrl,
          })
        })
        .catch(() => useWallpaperStore.getState().setWallpaper(defaultWallpaper))
    }
    initialized.current = true
  }, [query.data])

  useEffect(() => {
    if (!initialized.current) return
    const schedule = () => {
      window.clearTimeout(pending.current)
      pending.current = window.setTimeout(async () => {
        const preferences = currentPreferences(query.data?.preferences)
        try {
          const updated = await updatePreferences(revision.current, preferences)
          revision.current = updated.revision
          queryClient.setQueryData(preferenceKeys.current, updated)
        } catch {
          await queryClient.invalidateQueries({ queryKey: preferenceKeys.current })
        }
      }, 500)
    }
    const unsubscribers = [
      useThemeStore.subscribe(schedule),
      useWallpaperStore.subscribe(schedule),
      useWindowAppearanceStore.subscribe(schedule),
      useEventSamplingStore.subscribe(schedule),
      useStatusbarStore.subscribe(schedule),
      useWeatherStore.subscribe(schedule),
    ]
    return () => {
      window.clearTimeout(pending.current)
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [query.data?.preferences, queryClient])

  return null
}

function currentPreferences(
  base: SetupPreferences | undefined,
): SetupPreferences {
  const theme = useThemeStore.getState().theme
  const wallpaper = useWallpaperStore.getState().selectedWallpaper
  const windows = useWindowAppearanceStore.getState()
  const sampling = useEventSamplingStore.getState().intervalSeconds
  const statusbar = useStatusbarStore.getState()
  const weather = useWeatherStore.getState()
  return {
    schemaVersion: 1,
    locale: base?.locale ?? 'en-US',
    displayName: base?.displayName,
    theme,
    avatarPresetId: base?.avatarPresetId ?? 'default',
    avatarUrl: base?.avatarUrl,
    wallpaperId: wallpaper.id,
    windowAppearance: {
      backgroundMode: windows.backgroundMode,
      actionVisibility: windows.actionVisibility,
    },
    lockScreen: base?.lockScreen,
    statusbar: {
      clock: {
        variant: statusbar.clockVariant,
        hourFormat: statusbar.hourVariant,
        showDate: statusbar.showDate,
        showWeekday: statusbar.showWeekday,
        showMonth: statusbar.showMonth,
        showYear: statusbar.showYear,
      },
      weather: {
        showCondition: weather.showCondition,
        showGreeting: weather.showGreeting,
        showIcon: weather.showIcon,
      },
    },
    eventSamplingSeconds: sampling,
    dashboard: base?.dashboard ?? { version: 1 },
  }
}
