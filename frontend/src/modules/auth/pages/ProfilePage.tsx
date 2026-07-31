import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { Input } from '@/core/components/form'
import { Window } from '@/core/components/foundation/Window'
import { useAppStore } from '@/core/stores/app'
import { AvatarPicker, type AvatarSelection } from '@/modules/auth/components/AvatarPicker'
import { getPreferences, preferenceKeys, updatePreferences } from '@/modules/settings/api/preferences'

export function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)
  const preferences = useQuery({ queryKey: preferenceKeys.current, queryFn: getPreferences })
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState<AvatarSelection>({ presetId: 'default' })
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!preferences.data || savedSnapshot !== null) return
    const nextDisplayName = preferences.data.preferences.displayName ?? user?.displayName ?? user?.username ?? ''
    const nextAvatar = {
      presetId: preferences.data.preferences.avatarPresetId,
      imageUrl: preferences.data.preferences.avatarUrl,
    }
    setDisplayName(nextDisplayName)
    setAvatar(nextAvatar)
    setSavedSnapshot(snapshot(nextDisplayName, nextAvatar))
  }, [preferences.data, savedSnapshot, user?.displayName, user?.username])

  const currentSnapshot = useMemo(() => snapshot(displayName, avatar), [avatar, displayName])
  const isDirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot

  const mutation = useMutation({
    mutationFn: async () => {
      if (!preferences.data) throw new Error('Profile is not ready')
      return updatePreferences(preferences.data.revision, {
        ...preferences.data.preferences,
        displayName: displayName.trim(),
        avatarPresetId: avatar.presetId ?? 'custom',
        avatarUrl: avatar.imageUrl,
      })
    },
    onSuccess: (record) => {
      queryClient.setQueryData(preferenceKeys.current, record)
      if (user) setUser({ ...user, displayName: displayName.trim(), avatarPresetId: avatar.presetId, avatarUrl: avatar.imageUrl })
      setSavedSnapshot(currentSnapshot)
      setFeedback('Alterações salvas.')
    },
    onError: () => {
      setFeedback('Não foi possível salvar o perfil.')
    },
  })

  return (
    <Window title="Profile" icon={UserRound} canMaximize onClose={() => navigate('/')} className="h-full" contentClassName="p-8">
      <div className="mx-auto grid max-w-3xl gap-10 lg:grid-cols-[220px_1fr]">
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <div className="space-y-5">
          <div>
            <p className="text-sm text-[#151A21]/55 dark:text-white/55">Role</p>
            <p className="mt-1 text-lg font-medium">{user?.role ?? 'viewer'}</p>
          </div>
          <Input label="Nome de exibição" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
          <Input label="Username" value={user?.username ?? ''} readOnly />
          <button type="button" disabled={!isDirty || mutation.isPending || preferences.isPending} onClick={() => mutation.mutate()} className="rounded-xl bg-cyan-300 px-5 py-3 font-medium text-[#071525] disabled:cursor-not-allowed disabled:opacity-50">
            {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
          </button>
          {feedback ? <p role={mutation.isError ? 'alert' : 'status'} className={mutation.isError ? 'text-sm text-rose-300' : 'text-sm text-emerald-300'}>{feedback}</p> : null}
        </div>
      </div>
    </Window>
  )
}

function snapshot(displayName: string, avatar: AvatarSelection) {
  return JSON.stringify({ displayName: displayName.trim(), presetId: avatar.presetId ?? null, imageUrl: avatar.imageUrl ?? null })
}
