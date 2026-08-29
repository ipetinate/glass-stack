import type { ReactNode } from 'react'

import type { TabItem } from '@/core/components/foundation/Tabs'

import { AdvancedSettings } from '@/modules/settings/pages/AdvancedSettings/AdvancedSettings'
import { AppearanceSettings } from '@/modules/settings/pages/AppearanceSettings'
import { ConnectionsSettings } from '@/modules/settings/pages/ConnectionsSettings/ConnectionsSettings'
import { GeneralSettings } from '@/modules/settings/pages/GeneralSettings'
import { SecuritySettings } from '@/modules/settings/pages/SecuritySettings'
import { ServicesSettings } from '@/modules/settings/pages/ServicesSettings'

export const DEFAULT_SETTINGS_TAB = 'appearance'

export const SETTINGS_TAB_IDS = [
  'general',
  'appearance',
  'services',
  'connections',
  'security',
  'advanced',
] as const

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number]

export function isSettingsTabId(value: string): value is SettingsTabId {
  return (SETTINGS_TAB_IDS as readonly string[]).includes(value)
}

export const settingsTabs: TabItem[] = [
  { id: 'general', title: 'General', icon: 'Settings' },
  { id: 'appearance', title: 'Appearance', icon: 'Palette', pinned: true },
  { id: 'services', title: 'Services', icon: 'Server' },
  { id: 'connections', title: 'Connections', icon: 'Link2' },
  { id: 'security', title: 'Security', icon: 'ShieldCheck' },
  { id: 'advanced', title: 'Advanced', icon: 'AlertTriangle' },
]

export const settingsTabRoutes: Record<SettingsTabId, ReactNode> = {
  general: <GeneralSettings />,
  appearance: <AppearanceSettings />,
  services: <ServicesSettings />,
  connections: <ConnectionsSettings />,
  security: <SecuritySettings />,
  advanced: <AdvancedSettings />,
}
