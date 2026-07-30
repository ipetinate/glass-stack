import { useNavigate } from 'react-router'
import { useOnboardingStore } from '../stores/onboardingStore'
import { useOnboardingAction } from '../components/OnboardingActions'

const locales = [
  ['pt-BR', 'Português do Brasil', '/images/onboarding/flag-br.png'],
  ['en-US', 'English (United States)', '/images/onboarding/flag-us.png'],
  ['fr', 'Français', '/images/onboarding/flag-fr.png'],
  ['de', 'Deutsch', '/images/onboarding/flag-de.png'],
] as const

export function WelcomePage() {
  const navigate = useNavigate()
  const { locale, setField } = useOnboardingStore()
  useOnboardingAction({ label: 'Começar', onClick: () => navigate(useOnboardingStore.getState().bootstrapToken ? '/onboarding/account' : '/onboarding/connect') })
  return (
    <section className="flex flex-col items-center text-center">
      <img src="/images/onboarding/logo.png" alt="Glass Stack" className="size-40 object-contain sm:size-56" />
      <h1 className="font-encode text-5xl font-thin leading-none sm:text-7xl">Glass Stack</h1>
      <p className="mt-3 text-lg font-extralight sm:text-xl">Server management, made transparent.</p>
      <div className="mt-12 w-full max-w-xs space-y-2">
        {locales.map(([value, label, flag]) => (
          <button
            key={value}
            type="button"
            aria-pressed={locale === value}
            onClick={() => setField('locale', value)}
            className={`flex h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${locale === value ? 'bg-white/35 dark:bg-black/35' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
          >
            <img src={flag} alt="" className="size-6 rounded-full" />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
