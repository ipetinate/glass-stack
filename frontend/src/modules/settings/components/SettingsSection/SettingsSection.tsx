import type { PropsWithChildren } from 'react'

export type SettingsSectionProps = PropsWithChildren<{
  title: string
}>

export function SettingsSection({ children, title }: SettingsSectionProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>

      <div className="mt-5 flex gap-5">{children}</div>
    </section>
  )
}
