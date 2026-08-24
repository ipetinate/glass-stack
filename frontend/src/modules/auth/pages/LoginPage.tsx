import { useEffect } from 'react'

import { useLockStore } from '@/core/stores/lock'

export function LoginPage() {
  const lock = useLockStore((state) => state.lock)

  useEffect(() => {
    lock()
  }, [lock])

  return null
}
