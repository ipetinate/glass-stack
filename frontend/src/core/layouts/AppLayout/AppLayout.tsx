import { Searchbar } from '@/core/components/foundation/Searchbar'
import { Sidebar } from '@/core/components/foundation/Sidebar'
import { Statusbar } from '@/core/components/foundation/Statusbar'
import { Outlet } from 'react-router'

export function AppLayout() {
  return (
    <div className="grid h-dvh max-h-dvh w-full grid-cols-[162px_minmax(0,1fr)] gap-x-16 overflow-hidden p-6">
      <Sidebar />

      <div className="grid h-full min-h-0 grid-cols-2 grid-rows-[auto_minmax(0,1fr)] gap-x-6 gap-y-6 overflow-visible">
        <Statusbar />
        <Searchbar />

        <main className="col-span-2 h-full min-h-0 overflow-hidden text-[#151A21] dark:text-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
