import type { LucideIcon } from 'lucide-react'
import * as Icons from 'lucide-react'

export type IconName = {
  [Key in keyof typeof Icons]: (typeof Icons)[Key] extends LucideIcon
    ? Key
    : never
}[keyof typeof Icons]
