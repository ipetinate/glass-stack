import { Tooltip } from '@base-ui/react/tooltip'
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
      <Tooltip.Root>
        <Tooltip.Trigger
          delay={0}
          render={<Link to={to} aria-label={description} />}
          className="flex size-16 cursor-pointer items-center justify-center rounded-xl bg-white/80 shadow-sm transition-colors hover:bg-white dark:bg-[#151A21] dark:shadow-none dark:hover:bg-[#2A3038]/90"
        >
          <IconComponent className="size-10 stroke-1 text-[#151A21] dark:text-white" />
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Positioner
            side="right"
            align="center"
            sideOffset={8}
            className="z-50"
          >
            <Tooltip.Popup className="rounded-lg border border-white/30 bg-white/80 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-[#151A21] shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#151A21]/80 dark:text-white">
              {description}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>

      {active && (
        <div className="absolute left-20 top-7 bg-[#00BFFF] size-3 rounded-full" />
      )}
    </div>
  )
}