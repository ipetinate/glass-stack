import { Folder } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Window } from '@/core/components/foundation/Window'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'

export function FileManagerPage() {
  const navigate = useNavigate()
  const { confirmClose } = useUnsavedChanges({ scope: 'File Manager' })

  const handleClose = () => {
    if (!confirmClose()) return

    navigate('/')
  }

  return (
    <Window
      title="File Manager"
      icon={Folder}
      canMaximize
      onClose={handleClose}
      className="h-full"
    />
  )
}
