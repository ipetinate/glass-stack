import type { LucideIcon } from 'lucide-react'
import * as Icons from 'lucide-react'
import { Link } from 'react-router'

import type { IconName } from '@/core/types'

export type SidebarButtonProps = {
  icon: IconName
  active?: boolean
  description?: string
  to: string
}

export function SidebarButton({
  description,
  icon,
  active,
  to,
}: SidebarButtonProps) {
  const IconComponent = Icons[icon] as LucideIcon

  return (
    <div className="relative flex items-center justify-center">
      <Link
        to={to}
        aria-label={description}
        title={description}
        className="flex size-16 cursor-pointer items-center justify-center rounded-xl bg-white/80 shadow-sm transition-colors hover:bg-white dark:bg-[#151A21] dark:shadow-none dark:hover:bg-[#2A3038]/90"
      >
        <IconComponent className="size-10 stroke-1 text-[#151A21] dark:text-white" />
      </Link>

      {active && (
        <div className="absolute left-20 top-7 bg-[#00BFFF] size-3 rounded-full" />
      )}
    </div>
  )
}
