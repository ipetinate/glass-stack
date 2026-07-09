import { ShoppingBag } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Window } from '@/core/components/foundation/Window'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'

export function ApplicationsStore() {
  const navigate = useNavigate()
  const { confirmClose } = useUnsavedChanges({ scope: 'Applications Store' })

  const handleClose = () => {
    if (!confirmClose()) return

    navigate('/')
  }

  return (
    <Window
      title="Applications Store"
      icon={ShoppingBag}
      canMaximize
      onClose={handleClose}
      className="h-full"
    />
  )
}
