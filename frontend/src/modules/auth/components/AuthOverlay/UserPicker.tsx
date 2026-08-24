import { motion } from 'motion/react'

import { Avatar } from '@/core/components/ui/Avatar'
import { cn } from '@/core/functions/class-name'
import { GlassStackLoader } from '@/core/components/ui/GlassStackLoader'

import type { AuthIdentity } from '../../api/auth'
import { identityInitials, identityLabel, resolveAvatarImage } from './avatar'

export type UserPickerProps = {
  identities: AuthIdentity[]
  selectedId?: string
  loading?: boolean
  onSelect: (identity: AuthIdentity) => void
}

export function UserPicker({
  identities,
  selectedId,
  loading = false,
  onSelect,
}: UserPickerProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <GlassStackLoader label="Carregando usuários…" size={64} />
      </div>
    )
  }
  if (identities.length === 0) {
    return null
  }
  return (
    <div className="flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-8">
      {identities.map((identity) => {
        const image = resolveAvatarImage(identity)
        const selected = selectedId === identity.id
        return (
          <motion.button
            layout
            key={identity.id}
            type="button"
            onClick={() => onSelect(identity)}
            aria-label={`Entrar como ${identityLabel(identity)}`}
            className={cn(
              'group flex flex-col items-center gap-3 rounded-2xl p-3 outline-none transition-colors focus-visible:bg-white/10',
              selected && 'opacity-50',
            )}
          >
            <motion.div layoutId={`lock-avatar-${identity.id}`}>
              <Avatar
                size="xl"
                image={image}
                initials={image ? undefined : identityInitials(identity)}
              />
            </motion.div>
            <span className="text-sm font-medium text-[#151A21]/90 transition group-hover:text-[#151A21] dark:text-white/85 dark:group-hover:text-white">
              {identityLabel(identity)}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
