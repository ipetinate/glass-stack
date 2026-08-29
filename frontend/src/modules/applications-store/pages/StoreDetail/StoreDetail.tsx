import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ApplicationDetail, CustomInstallForm } from '../../components'
import {
  useActiveOperation,
  useApplication,
  useEditApplication,
  useInstalledAppMap,
  useInstallApplication,
  useRemoveApplication,
  useUpdateApplication,
} from '../../repositories'
import { useInstallOperations } from '../../stores/install-operations'

export function StoreDetail() {
  const { appId } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const installMutation = useInstallApplication()
  const removeMutation = useRemoveApplication()
  const updateMutation = useUpdateApplication()
  const editMutation = useEditApplication()
  const [customInstallOpen, setCustomInstallOpen] = useState(false)
  const [configuring, setConfiguring] = useState(false)

  const selectedQuery = useApplication(appId)
  const installedMap = useInstalledAppMap()
  const installedApp = appId ? installedMap.get(appId) : undefined
  const activeOperation = useActiveOperation(appId)
  const failedOperation = useInstallOperations((state) =>
    appId ? state.operations[appId] : undefined,
  )

  const handleBack = () => {
    navigate('/app-store')
  }

  if (!appId) {
    navigate('/app-store')
    return null
  }

  if (selectedQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-white/50">Loading…</div>
      </div>
    )
  }

  if (selectedQuery.isError || !selectedQuery.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-5 text-sm text-rose-100">
          Could not load the application.
        </div>
      </div>
    )
  }

  const operationError = failedOperation?.status === 'error' ? failedOperation.message : undefined
  const mutationError =
    installMutation.isError || removeMutation.isError || updateMutation.isError || editMutation.isError
      ? (installMutation.error?.message ??
        removeMutation.error?.message ??
        updateMutation.error?.message ??
        editMutation.error?.message ??
        'Falha na operação.')
      : undefined
  const installErrorMessage = operationError ?? mutationError

  const handleSubmitOptions = (options: { port: number; volume: string }) => {
    if (configuring) {
      editMutation.mutate({ appId, mode: 'custom', options })
    } else {
      installMutation.mutate({ appId, mode: 'custom', options })
    }
    setCustomInstallOpen(false)
    setConfiguring(false)
  }

  return (
    <div className="relative h-full min-h-0">
      <ApplicationDetail
        application={selectedQuery.data}
        installedApp={installedApp}
        activeOperation={activeOperation}
        onBack={handleBack}
        onInstall={() => installMutation.mutate({ appId, mode: 'standard' })}
        onCustomInstall={() => {
          setCustomInstallOpen(true)
          setConfiguring(false)
        }}
        onUpdate={() => updateMutation.mutate(appId)}
        onConfigure={() => {
          setCustomInstallOpen(true)
          setConfiguring(true)
        }}
        onUninstall={() =>
          removeMutation.mutate({ appId, request: { containers: true, config: false, data: false } })
        }
      />

      {customInstallOpen && selectedQuery.data ? (
        <CustomInstallForm
          application={selectedQuery.data}
          mode={customInstallOpen && configuring ? 'configure' : 'install'}
          initialOptions={configuring ? installedApp?.options : undefined}
          onCancel={() => {
            setCustomInstallOpen(false)
            setConfiguring(false)
          }}
          onSubmit={handleSubmitOptions}
        />
      ) : null}

      {installErrorMessage ? (
        <div
          role="alert"
          className="mt-4 shrink-0 rounded-xl border border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          Operation failed. {installErrorMessage}
        </div>
      ) : null}
    </div>
  )
}