import { cn } from '@/core/functions/class-name'
import { useTheme } from '@/core/hooks/useTheme/useTheme'
import { SelectableCard } from '@/modules/settings/components/SelectableCard'

type ThemeOption = {
  id: 'light' | 'dark'
  title: string
  description: string
}

const themeOptions: ThemeOption[] = [
  {
    id: 'light',
    title: 'Light',
    description: 'Bright surfaces with dark text.',
  },
  {
    id: 'dark',
    title: 'Dark',
    description: 'Deep surfaces with light text.',
  },
]

export function ThemeToggler() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const activeTheme = theme === 'system' ? resolvedTheme : theme

  return (
    <div className="flex flex-wrap gap-5">
      {themeOptions.map((option) => {
        const selected = activeTheme === option.id

        return (
          <SelectableCard
            key={option.id}
            className="w-52"
            title={option.title}
            description={option.description}
            selected={selected}
            selectedIndicatorPosition="bottom-right"
            onSelect={() => setTheme(option.id)}
          >
            <ThemePreview theme={option.id} />
          </SelectableCard>
        )
      })}
    </div>
  )
}

export function ThemePreview({
  theme,
}: {
  theme: 'light' | 'dark'
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block h-28 overflow-hidden rounded-lg border',
        theme === 'light'
          ? 'border-black/10 bg-[#F3F6FA]'
          : 'border-white/10 bg-[#10151C]',
      )}
    >
      <span
        className={cn(
          'absolute left-3 top-3 h-5 w-24 rounded-md',
          theme === 'light' ? 'bg-white' : 'bg-[#202832]',
        )}
      />
      <span
        className={cn(
          'absolute bottom-3 left-3 right-3 h-14 rounded-lg',
          theme === 'light' ? 'bg-white shadow-sm' : 'bg-[#151A21]',
        )}
      />
      <span
        className={cn(
          'absolute bottom-6 left-6 h-3 w-16 rounded-full',
          theme === 'light' ? 'bg-slate-300' : 'bg-white/20',
        )}
      />
      <span
        className={cn(
          'absolute bottom-6 right-6 size-5 rounded-md',
          theme === 'light' ? 'bg-slate-200' : 'bg-white/20',
        )}
      />
    </span>
  )
}
