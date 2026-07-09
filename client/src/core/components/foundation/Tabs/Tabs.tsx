import { useMemo, useState, type ReactNode } from 'react'
import { useUnsavedChanges } from '@/core/hooks/useUnsavedChanges'

import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'

import { cn } from '@/core/functions/class-name'
import { sortTabs } from './Tabs.functions'
import type { IconName } from '@/core/types'
import { TabTrigger } from './TabTrigger'

export type TabItem = {
  id: string
  title: string
  content: ReactNode
  icon?: IconName
  closeUnsavedChangesScope?: string
  pinned?: boolean
}

export type TabsProps = {
  tabs: TabItem[]
  activeTabId?: string
  defaultActiveTabId?: string
  allowClose?: boolean
  allowPin?: boolean
  iconOnly?: boolean
  className?: string
  listClassName?: string
  panelClassName?: string
  tabsStartClassName?: string
  onActiveTabChange?: (tabId: string) => void
  onTabsChange?: (tabs: TabItem[]) => void
  onTabClose?: (tab: TabItem) => void
  onTabPinChange?: (tab: TabItem, pinned: boolean) => void
}

export function Tabs({
  tabs,
  activeTabId,
  defaultActiveTabId,
  allowClose = false,
  allowPin = false,
  iconOnly = false,
  className,
  listClassName,
  panelClassName,
  tabsStartClassName = 'pl-10',
  onActiveTabChange,
  onTabsChange,
  onTabClose,
  onTabPinChange,
}: TabsProps) {
  const [internalTabs, setInternalTabs] = useState(tabs)
  const [internalActiveTabId, setInternalActiveTabId] = useState(
    defaultActiveTabId ?? tabs[0]?.id,
  )
  const { confirmClose } = useUnsavedChanges()

  const currentTabs = onTabsChange ? tabs : internalTabs
  const currentActiveTabId = activeTabId ?? internalActiveTabId
  const sortedTabs = useMemo(() => sortTabs(currentTabs), [currentTabs])
  const activeTab =
    currentTabs.find((tab) => tab.id === currentActiveTabId) ?? sortedTabs[0]

  const commitTabs = (nextTabs: TabItem[]) => {
    if (onTabsChange) {
      onTabsChange(nextTabs)
      return
    }

    setInternalTabs(nextTabs)
  }

  const activateTab = (tabId: string) => {
    if (!activeTabId) {
      setInternalActiveTabId(tabId)
    }

    onActiveTabChange?.(tabId)
  }

  const closeTab = (tab: TabItem) => {
    if (!confirmClose(tab.closeUnsavedChangesScope)) return

    const nextTabs = currentTabs.filter(
      (currentTab) => currentTab.id !== tab.id,
    )

    commitTabs(nextTabs)
    onTabClose?.(tab)

    if (tab.id === currentActiveTabId) {
      const nextActiveTab = sortTabs(nextTabs)[0]

      if (nextActiveTab) {
        activateTab(nextActiveTab.id)
      }
    }
  }

  const togglePinned = (tab: TabItem) => {
    const pinned = !tab.pinned
    const nextTabs = currentTabs.map((currentTab) =>
      currentTab.id === tab.id ? { ...currentTab, pinned } : currentTab,
    )

    commitTabs(nextTabs)
    onTabPinChange?.(tab, pinned)
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={cn(
          'flex h-10 shrink-0 items-end overflow-hidden',
          tabsStartClassName,
          listClassName,
        )}
      >
        {sortedTabs.map((tab) => {
          const selected = tab.id === activeTab?.id

          return (
            <TabTrigger
              key={tab.id}
              id={tab.id}
              title={tab.title}
              icon={tab.icon}
              selected={selected}
              pinned={tab.pinned}
              allowClose={allowClose}
              allowPin={allowPin}
              iconOnly={iconOnly}
              onActivate={() => activateTab(tab.id)}
              onClose={() => closeTab(tab)}
              onPinChange={() => togglePinned(tab)}
            />
          )
        })}
      </div>

      <BackgroundBlur
        as="div"
        id={activeTab ? `${activeTab.id}-panel` : undefined}
        role="tabpanel"
        aria-labelledby={activeTab ? `${activeTab.id}-tab` : undefined}
        className={cn(
          'min-h-0 flex-1 rounded-b-xl rounded-tl-xl rounded-tr-xl border border-white/70 bg-white/68 p-0 shadow-none dark:border-0 dark:bg-black/25',
          panelClassName,
        )}
      >
        <div className="h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain p-10">
          {activeTab?.content}
        </div>
      </BackgroundBlur>
    </div>
  )
}
