import type { TabItem } from './Tabs'

export function sortTabs(tabs: TabItem[]) {
  return [...tabs].sort((leftTab, rightTab) => {
    if (leftTab.pinned === rightTab.pinned) return 0

    return leftTab.pinned ? -1 : 1
  })
}
