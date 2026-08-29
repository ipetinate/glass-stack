import { Outlet, useLocation, useNavigate } from 'react-router'
import { ShoppingBag } from 'lucide-react'

import { Window } from '@/core/components/foundation/Window'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'

export function StoreLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { confirmClose } = useUnsavedChanges({ scope: 'Applications Store' })

  const handleClose = () => {
    if (!confirmClose()) return
    navigate('/')
  }

  return (
    <Window
      title="App Store"
      icon={ShoppingBag}
      canMaximize
      onClose={handleClose}
      className="h-full"
      contentClassName="pt-6 overflow-hidden"
    >
      <Outlet />
    </Window>
  )
}
