import { useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Tabs } from '@/core/components/foundation/Tabs'
import { Window } from '@/core/components/foundation/Window'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'
import { useWallpaperSearchStore } from '@/core/stores/wallpaper-search'
import { AppearanceSettings } from '@/modules/settings/pages/AppearanceSettings'
import { GeneralSettings } from '@/modules/settings/pages/GeneralSettings'
import { SecuritySettings } from '@/modules/settings/pages/SecuritySettings'
import { ServicesSettings } from '@/modules/settings/pages/ServicesSettings'

export function SettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearWallpaperSearch = useWallpaperSearchStore(
    (state) => state.clearSearch,
  )

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
        defaultActiveTabId="appearance"
        tabs={[
          {
            id: 'general',
            title: 'General',
            icon: 'Settings',
            content: <GeneralSettings />,
          },
          {
            id: 'appearance',
            title: 'Appearance',
            icon: 'Palette',
            pinned: true,
            content: <AppearanceSettings />,
          },
          {
            id: 'services',
            title: 'Services',
            icon: 'Server',
            content: <ServicesSettings />,
          },
          {
            id: 'security',
            title: 'Security',
            icon: 'ShieldCheck',
            content: <SecuritySettings />,
          },
        ]}
      />
    </Window>
  )
}
