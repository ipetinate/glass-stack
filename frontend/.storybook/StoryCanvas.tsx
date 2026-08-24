import type { ReactNode } from 'react'

export function StoryCanvas({ children }: { children: ReactNode }) {
  return <div className="min-h-60 w-full max-w-xl p-6 font-encode text-[#151A21]">{children}</div>
}
