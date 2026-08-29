import { ExternalLink, LoaderCircle, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ContextMenu, type ContextMenuItem } from '@/core/components/ui/context-menu'

import {
  useActiveOperation,
  useCatalogAppIcons,
  useInstalledApplications,
  useRemoveApplication,
} from '@/modules/applications-store/repositories'
import type { InstalledApplication } from '@/modules/applications-store/types'

const ORDER_KEY = 'glassstack.dashboard.installed-order'

const OPERATION_LABELS: Record<string, string> = {
  installing: 'Installing…',
  updating: 'Updating…',
  editing: 'Editing…',
  removing: 'Removing…',
}

function readSavedOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function InstalledApps() {
  const appsQuery = useInstalledApplications()
  const iconsQuery = useCatalogAppIcons()
  const removeMutation = useRemoveApplication()
  const apps = appsQuery.data?.data ?? []

  const [order, setOrder] = useState<string[]>(readSavedOrder)
  const [dragKey, setDragKey] = useState<{ id: string; index: number } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; appId: string } | null>(null)
  const dragOverIndex = useRef<number>(-1)

  useEffect(() => {
    const known = new Set(order)
    const missing = apps.filter((app) => !known.has(app.id)).map((app) => app.id)
    if (missing.length > 0) {
      setOrder((current) => [...current, ...missing])
    }
  }, [apps, order])

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(order))
    } catch {
      // storage unavailable — reorder just won't persist
    }
  }, [order])

  const sortedApps = [...apps].sort((a, b) => {
    const ia = order.indexOf(a.id)
    const ib = order.indexOf(b.id)
    const aa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
    const bb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
    return aa - bb || a.title.localeCompare(b.title)
  })

  const handleDrop = (targetIndex: number) => {
    const source = dragKey
    dragOverIndex.current = -1
    if (!source) return
    setOrder((current) => {
      const next = current.filter((id) => id !== source.id)
      next.splice(targetIndex, 0, source.id)
      return next
    })
    setDragKey(null)
  }

  return (
    <div
      role="list"
      aria-label="Installed applications"
      className="flex min-h-0 flex-1 flex-col"
    >
      {appsQuery.isError ? (
        <p className="text-sm text-white/50">Could not load installed applications.</p>
      ) : appsQuery.isPending ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-6">
          <p className="col-span-2 text-sm text-white/50">Loading…</p>
        </div>
      ) : sortedApps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
          No apps installed yet.
          <br />
          <span className="text-white/35">Install something from the App Store.</span>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-wrap content-start items-start justify-start gap-x-6 gap-y-6 overflow-y-auto pr-1 pt-6">
          {sortedApps.map((app, index) => (
            <InstalledAppTile
              key={app.id}
              app={app}
              iconSrc={iconsQuery.data?.get(app.id)}
              index={index}
              onDragStart={(id) => setDragKey({ id, index })}
              onDragOver={(index) => {
                dragOverIndex.current = index
              }}
              onDrop={() => handleDrop(dragOverIndex.current)}
              onContextMenu={(e, id) => {
                e.preventDefault()
                setMenu({ x: e.clientX, y: e.clientY, appId: id })
              }}
            />
          ))}
        </div>
      )}

      <ContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        onClose={() => setMenu(null)}
        items={buildContextItems({
          app: menu ? sortedApps.find((app) => app.id === menu.appId) : undefined,
          onOpenUrl: (app) => window.open(app.accessUrl, '_blank', 'noopener,noreferrer'),
          onUninstall: (app) =>
            removeMutation.mutate({
              appId: app.id,
              request: { containers: true, config: false, data: false },
            }),
        })}
      />
    </div>
  )
}

function buildContextItems({
  app,
  onOpenUrl,
  onUninstall,
}: {
  app?: InstalledApplication
  onOpenUrl: (app: InstalledApplication) => void
  onUninstall: (app: InstalledApplication) => void
}): ContextMenuItem[] {
  if (!app) return []
  const items: ContextMenuItem[] = [
    {
      id: 'uninstall',
      label: 'Uninstall',
      icon: Trash2,
      destructive: true,
      onSelect: () => onUninstall(app),
    },
  ]
  if (app.accessUrl) {
    items.push({
      id: 'open-url',
      label: 'Open URL',
      icon: ExternalLink,
      onSelect: () => onOpenUrl(app),
    })
  }
  return items
}

function InstalledAppTile({
  app,
  iconSrc,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu,
}: {
  app: InstalledApplication
  iconSrc?: string
  index: number
  onDragStart: (id: string) => void
  onDragOver: (index: number) => void
  onDrop: () => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
}) {
  const activeOperation = useActiveOperation(app.id)
  const installedBusyStatus = ['installing', 'updating', 'editing', 'removing'].includes(
    app.status,
  )
  const isBusy =
    (activeOperation !== undefined &&
      ['queued', 'installing', 'updating', 'editing', 'removing'].includes(
        activeOperation.status,
      )) ||
    installedBusyStatus
  const progress = activeOperation?.progress ?? 0
  const label = activeOperation
    ? OPERATION_LABELS[activeOperation.status] ?? app.title
    : installedBusyStatus
      ? OPERATION_LABELS[app.status] ?? app.title
      : app.title

  const content = (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative grid size-14 place-items-center rounded-[13px] border border-white/15 bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),inset_0_-2px_2px_rgba(255,255,255,0.05)] backdrop-blur-md">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={`${app.title} icon`}
            draggable={false}
            className={`size-9 shrink-0 rounded-lg object-cover ${isBusy ? 'opacity-50' : ''}`}
          />
        ) : (
          <div
            className={`grid size-9 place-items-center rounded-lg bg-black/10 text-base font-bold text-white/85 ${
              isBusy ? 'opacity-50' : ''
            }`}
          >
            {app.title.charAt(0).toUpperCase()}
          </div>
        )}
        {isBusy ? (
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center rounded-xl bg-black/50"
          >
            <LoaderCircle className="size-5 animate-spin text-white" />
          </div>
        ) : null}
        {app.runtime === 'running' && !isBusy ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
          />
        ) : null}
      </div>
      {isBusy ? (
        <div className="flex w-fit flex-col items-center gap-1">
          <p className="text-xs font-semibold text-white">{label}</p>
          <div
            role="progressbar"
            aria-label={`${label} ${Math.round(progress)}%`}
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="flex items-center gap-1.5"
          >
            <div className="h-1 w-20 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#00bfff] transition-all duration-500"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-white/70">{Math.round(progress)}%</span>
          </div>
        </div>
      ) : (
        <p className="w-full truncate text-center text-xs font-semibold text-white">{app.title}</p>
      )}
    </div>
  )

  const accessible = app.accessUrl && !isBusy && app.status === 'installed'

  if (accessible) {
    return (
      <a
        href={app.accessUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={app.title}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', app.id)
          onDragStart(app.id)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          onDragOver(index)
        }}
        onDrop={onDrop}
        onContextMenu={(event) => onContextMenu(event, app.id)}
        className="rounded-xl transition-transform hover:scale-[1.03]"
      >
        {content}
      </a>
    )
  }

  return (
    <div
      title={app.title}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', app.id)
        onDragStart(app.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onDragOver(index)
      }}
      onDrop={onDrop}
      onContextMenu={(event) => onContextMenu(event, app.id)}
      className="cursor-grab rounded-xl opacity-90 active:cursor-grabbing"
    >
      {content}
    </div>
  )
}