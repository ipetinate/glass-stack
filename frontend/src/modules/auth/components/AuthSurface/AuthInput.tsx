export type AuthInputProps = {
  label: string
  type?: string
  value: string
  autoComplete?: string
  onBlur?: () => void
  onChange: (value: string) => void
}

export function AuthInput({
  label,
  type = 'text',
  value,
  autoComplete,
  onBlur,
  onChange,
}: AuthInputProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-white/60">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/60 focus:ring-1 focus:ring-cyan-300/40"
      />
    </label>
  )
}
