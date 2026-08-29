import { useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { Tabs } from '@/core/components/foundation/Tabs'
import { Window } from '@/core/components/foundation/Window'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'
import { useWallpaperSearchStore } from '@/core/stores/wallpaper-search'

import {
  DEFAULT_SETTINGS_TAB,
  isSettingsTabId,
  settingsTabs,
} from './SettingsPage.tabs'

export function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const clearWallpaperSearch = useWallpaperSearchStore(
    (state) => state.clearSearch,
  )

  const tabFromPath = location.pathname.split('/')[2]
  const activeTabId = isSettingsTabId(tabFromPath ?? '')
    ? tabFromPath
    : DEFAULT_SETTINGS_TAB

  const { confirmClose } = useUnsavedChanges({ scope: 'Settings' })

  const handleClose = () => {
    if (!confirmClose()) return

    clearWallpaperSearch()
    queryClient.removeQueries({
      exact: false,
      queryKey: ['unsplash-wallpapers'],
    })
    navigate('/')
  }

  if (tabFromPath !== undefined && !isSettingsTabId(tabFromPath)) {
    return <Navigate to={`/settings/${DEFAULT_SETTINGS_TAB}`} replace />
  }

  return (
    <Window
      title="Settings"
      icon={Settings}
      canMaximize
      onClose={handleClose}
      className="h-full"
      contentClassName="pt-10"
    >
      <Tabs
        activeTabId={activeTabId}
        onActiveTabChange={(id) => navigate(`/settings/${id}`)}
        renderPanel={() => <Outlet />}
        tabs={settingsTabs}
      />
    </Window>
  )
}
