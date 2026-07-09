import { SettingsSection } from '@/modules/settings/components/SettingsSection'
import { ThemeToggler } from '@/modules/settings/components/ThemeToggler'
import { WallpaperSelector } from '@/modules/settings/components/WallpaperSelector'
import { WindowSettings } from '@/modules/settings/components/WindowSettings'

export function AppearanceSettings() {
  return (
    <div className="flex min-h-0 flex-col gap-10">
      <div className="grid gap-10 xl:grid-cols-[auto_1fr]">
        <SettingsSection title="Theme">
          <ThemeToggler />
        </SettingsSection>

        <SettingsSection title="Windows">
          <WindowSettings />
        </SettingsSection>
      </div>

      <SettingsSection title="Background">
        <WallpaperSelector />
      </SettingsSection>
    </div>
  )
}
