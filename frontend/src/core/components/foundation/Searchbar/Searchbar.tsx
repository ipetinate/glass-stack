import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'

export function Searchbar() {
  return (
    <BackgroundBlur className="w-full flex items-center py-10 px-5">
      <input
        placeholder="Search..."
        className="w-full border-none bg-transparent text-2xl font-light text-[#151A21] placeholder:text-[#151A21]/45 focus:outline-none dark:text-white dark:placeholder:text-white/50"
      />
    </BackgroundBlur>
  )
}
