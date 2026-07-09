import type { IconName } from '@/core/types'
import type { LucideIcon } from 'lucide-react'
import type { PropsWithChildren } from 'react'

import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { cn } from '@/core/functions/class-name/class-name'

import * as Icons from 'lucide-react'

type WidgetProps = PropsWithChildren<{
  className?: string
  icon?: IconName
  title: string
}>

export function Widget({ children, className, icon, title }: WidgetProps) {
  const Icon = icon ? (Icons[icon] as LucideIcon) : null

  return (
    <BackgroundBlur
      className={cn(
        'h-full w-full flex flex-col gap-4 align-start p-5 shadow-none dark:shadow-none',
        className,
      )}
    >
      <div className="w-full flex flex-row justify-between items-center">
        <p className="text-lg uppercase font-extralight">{title}</p>

        {Icon && <Icon className="stroke-1 w-6 h-6" />}
      </div>
      {children}
    </BackgroundBlur>
  )
}
