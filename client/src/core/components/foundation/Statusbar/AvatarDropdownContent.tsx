export function AvatarDropdownContent() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-base font-semibold">Profile</p>
      <div>
        <p className="font-semibold">User</p>
        <p className="text-[#151A21]/60 dark:text-white/55">
          Local profile settings
        </p>
      </div>
      <button
        className="rounded-lg border border-black/10 bg-white/40 px-3 py-2 text-left font-semibold dark:border-white/10 dark:bg-white/5"
        type="button"
      >
        Change profile photo
      </button>
      <button
        className="rounded-lg border border-black/10 bg-white/40 px-3 py-2 text-left font-semibold dark:border-white/10 dark:bg-white/5"
        type="button"
      >
        Configure name
      </button>
      <button
        className="rounded-lg border border-black/10 bg-white/40 px-3 py-2 text-left font-semibold dark:border-white/10 dark:bg-white/5"
        type="button"
      >
        Manage password
      </button>
    </div>
  )
}
