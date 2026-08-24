import { Lock, LogOut, Pencil } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { useAppStore } from '@/core/stores/app'
import { useLockStore } from '@/core/stores/lock'
import { authKeys, logout } from '@/modules/auth/api/auth'

const roleLabels = {
  admin: 'Administrador',
  operator: 'Operador',
  viewer: 'Visualizador',
} as const

export function AvatarDropdownContent({ onClose }: { onClose: () => void }) {
  const user = useAppStore((state) => state.user)
  const clearUser = useAppStore((state) => state.clearUser)
  const lock = useLockStore((state) => state.lock)
  const showUserPicker = useLockStore((state) => state.showUserPicker)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const name = user?.displayName || user?.username || 'User'

  const signOut = async () => {
    onClose()
    try {
      await logout()
    } finally {
      showUserPicker()
      clearUser()
      await queryClient.invalidateQueries({ queryKey: authKeys.session })
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        <p className="mt-0.5 truncate text-xs leading-tight text-[#151A21]/60 dark:text-white/55">
          {user ? roleLabels[user.role] : 'Local profile settings'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label="Editar perfil"
          onClick={() => {
            onClose()
            navigate('/profile')
          }}
        >
          <Pencil aria-hidden="true" size={15} />
        </IconButton>
        <IconButton
          label="Bloquear tela"
          onClick={() => {
            onClose()
            lock()
          }}
        >
          <Lock aria-hidden="true" size={15} />
        </IconButton>
        <IconButton
          label="Sair"
          destructive
          onClick={() => void signOut()}
        >
          <LogOut aria-hidden="true" size={15} />
        </IconButton>
      </div>
    </div>
  )
}

function IconButton({
  children,
  destructive = false,
  label,
  onClick,
}: {
  children: React.ReactNode
  destructive?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={[
        'flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors',
        'border-black/10 bg-white/40 hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
        destructive
          ? 'hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-400/40 dark:hover:text-rose-300'
          : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
