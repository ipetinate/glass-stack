import { useAppStore } from '@/core/stores/app'
import { useNavigate } from 'react-router'

export function AvatarDropdownContent() {
  const user = useAppStore((state) => state.user)
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-base font-semibold">Profile</p>
      <div>
        <p className="font-semibold">{user?.displayName ?? user?.username ?? 'User'}</p>
        <p className="text-[#151A21]/60 dark:text-white/55">
          {user?.role ?? 'Local profile settings'}
        </p>
      </div>
      <button
        className="rounded-lg border border-black/10 bg-white/40 px-3 py-2 text-left font-semibold dark:border-white/10 dark:bg-white/5"
        type="button"
        onClick={() => navigate('/profile')}
      >
        Gerenciar perfil
      </button>
    </div>
  )
}
