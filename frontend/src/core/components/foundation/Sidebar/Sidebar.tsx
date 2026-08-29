import { useLocation } from 'react-router'

import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'

import { SidebarButton } from './SidebarButton'

export function Sidebar() {
  const { pathname } = useLocation()
  const isActive = (route: string) =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)

  return (
    <BackgroundBlur className="h-full w-full max-w-[162px] py-10 px-5">
      <div className="flex h-full flex-col items-center gap-14">
        <div>
          <img src="/images/logo.png" />
        </div>

        <div className="flex h-full flex-col items-center justify-between gap-10">
          <nav className="flex flex-col gap-4">
            <SidebarButton
              to="/"
              active={isActive('/')}
              description="Dashboard"
              icon="LayoutDashboard"
            />
            <SidebarButton
              to="/app-store"
              active={isActive('/app-store')}
              description="Application Store"
              icon="ShoppingBag"
            />
            <SidebarButton
              to="/terminal"
              active={isActive('/terminal')}
              description="Terminal"
              icon="SquareTerminal"
            />
            <SidebarButton
              to="/file-manager"
              active={isActive('/file-manager')}
              description="File Manager"
              icon="Folder"
            />
          </nav>

          <nav>
            <SidebarButton
              to="/settings"
              active={isActive('/settings')}
              description="Settings"
              icon="Settings"
            />
          </nav>
        </div>
      </div>
    </BackgroundBlur>
  )
}
