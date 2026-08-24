import type { PropsWithChildren } from 'react'

export function AuthSurface({ children }: PropsWithChildren) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#071525] p-6 text-white">
      {children}
    </div>
  )
}
