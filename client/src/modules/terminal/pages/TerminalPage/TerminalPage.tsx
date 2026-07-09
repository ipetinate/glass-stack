import { SquareTerminal } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Window } from '@/core/components/foundation/Window'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'

export function TerminalPage() {
  const navigate = useNavigate()
  const { confirmClose } = useUnsavedChanges({ scope: 'Terminal' })

  const handleClose = () => {
    if (!confirmClose()) return

    navigate('/')
  }

  return (
    <Window
      title="Terminal"
      icon={SquareTerminal}
      canMaximize
      onClose={handleClose}
      className="h-full"
    />
  )
}
