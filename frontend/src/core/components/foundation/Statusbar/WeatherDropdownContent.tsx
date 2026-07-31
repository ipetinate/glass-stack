import { ChevronDown, MapPin } from 'lucide-react'
import { useState } from 'react'

import { Checkbox } from '@/core/components/form/Checkbox'
import { cn } from '@/core/functions/class-name'
import {
  useSearchWeatherLocation,
  useWeatherStore,
  type WeatherLocation,
} from '@/lib/weather'

const inputClassName =
  'rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-[#151A21]/35 focus:border-sky-400 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-white/35'

export function WeatherDropdownContent() {
  const [search, setSearch] = useState('')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [advancedSearch, setAdvancedSearch] = useState({
    city: '',
    country: '',
    state: '',
  })
  const {
    mode,
    selectedLocation,
    setDisplayOption,
    setManualLocation,
    showCondition,
    showGreeting,
    showIcon,
    useGeolocation,
  } = useWeatherStore()
  const locationSearch = useSearchWeatherLocation(search)
  const shouldSearch = search.trim().length >= 3
  const locations = locationSearch.data ?? []

  const selectLocation = (location: WeatherLocation) => {
    setManualLocation(location)
    setSearch(formatWeatherLocation(location))
  }

  const submitAdvancedSearch = () => {
    setSearch(
      [advancedSearch.city, advancedSearch.state, advancedSearch.country]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(', '),
    )
  }

  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-4 text-sm">
      <p className="text-base font-semibold">Weather</p>
      <div className="rounded-xl border border-black/10 bg-white/35 p-3 dark:border-white/10 dark:bg-white/5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#151A21]/45 dark:text-white/40">
          Active location
        </p>
        <p className="mt-1 font-semibold">
          {mode === 'manual' && selectedLocation
            ? formatWeatherLocation(selectedLocation)
            : 'Browser location'}
        </p>
      </div>

      <button
        type="button"
        onClick={useGeolocation}
        className={cn(
          'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 font-semibold transition-colors',
          mode === 'geolocation'
            ? 'border-sky-400 bg-sky-400/15 text-sky-700 dark:text-sky-200'
            : 'border-black/10 bg-white/35 hover:bg-white/55 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
        )}
      >
        <MapPin aria-hidden="true" className="size-4" />
        Use my location
      </button>

      <label className="flex flex-col gap-1.5">
        Search city, ZIP or postal code
        <input
          className={inputClassName}
          placeholder="Try São Paulo, 10001, Lisbon..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <WeatherLocationResults
        isError={locationSearch.isError}
        isLoading={shouldSearch && locationSearch.isFetching}
        locations={locations}
        onSelect={selectLocation}
        shouldSearch={shouldSearch}
      />

      <div className="rounded-xl border border-black/10 bg-white/25 dark:border-white/10 dark:bg-white/5">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 font-semibold"
          onClick={() => setIsAdvancedOpen((isOpen) => !isOpen)}
        >
          Advanced search
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 transition-transform',
              isAdvancedOpen && 'rotate-180',
            )}
          />
        </button>

        {isAdvancedOpen && (
          <div className="grid gap-2 border-t border-black/10 p-3 dark:border-white/10">
            <input
              className={inputClassName}
              placeholder="Country"
              value={advancedSearch.country}
              onChange={(event) =>
                setAdvancedSearch((currentSearch) => ({
                  ...currentSearch,
                  country: event.target.value,
                }))
              }
            />
            <input
              className={inputClassName}
              placeholder="State"
              value={advancedSearch.state}
              onChange={(event) =>
                setAdvancedSearch((currentSearch) => ({
                  ...currentSearch,
                  state: event.target.value,
                }))
              }
            />
            <input
              className={inputClassName}
              placeholder="City"
              value={advancedSearch.city}
              onChange={(event) =>
                setAdvancedSearch((currentSearch) => ({
                  ...currentSearch,
                  city: event.target.value,
                }))
              }
            />
            <button
              type="button"
              className="rounded-lg border border-sky-400 bg-sky-400/15 px-3 py-2 font-semibold text-sky-700 dark:text-sky-200"
              onClick={submitAdvancedSearch}
            >
              Search
            </button>
          </div>
        )}
      </div>

      <label className="flex items-center justify-between gap-4">
        Show icon
        <Checkbox
          checked={showIcon}
          onChange={(event) =>
            setDisplayOption('showIcon', event.target.checked)
          }
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        Show condition
        <Checkbox
          checked={showCondition}
          onChange={(event) =>
            setDisplayOption('showCondition', event.target.checked)
          }
        />
      </label>

      <label className="flex items-center justify-between gap-4">
        Show greeting
        <Checkbox
          checked={showGreeting}
          onChange={(event) =>
            setDisplayOption('showGreeting', event.target.checked)
          }
        />
      </label>
    </div>
  )
}

function WeatherLocationResults({
  isError,
  isLoading,
  locations,
  onSelect,
  shouldSearch,
}: {
  isError: boolean
  isLoading: boolean
  locations: WeatherLocation[]
  onSelect: (location: WeatherLocation) => void
  shouldSearch: boolean
}) {
  if (!shouldSearch) {
    return (
      <p className="rounded-lg border border-dashed border-black/10 p-3 text-xs text-[#151A21]/55 dark:border-white/10 dark:text-white/45">
        Try city names, ZIP codes, or landmarks.
      </p>
    )
  }

  if (isLoading) {
    return (
      <p className="rounded-lg border border-black/10 bg-white/25 p-3 text-xs text-[#151A21]/60 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
        Searching locations...
      </p>
    )
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-400/35 bg-red-400/10 p-3 text-xs text-red-700 dark:text-red-200">
        Could not search locations. Your current weather location was not
        changed.
      </p>
    )
  }

  if (locations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/10 p-3 text-xs text-[#151A21]/55 dark:border-white/10 dark:text-white/45">
        No locations found. Try a city, ZIP code, or a more specific place.
      </p>
    )
  }

  return (
    <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
      {locations.map((location) => (
        <button
          key={location.id}
          type="button"
          className="rounded-lg border border-black/10 bg-white/35 px-3 py-2 text-left transition-colors hover:bg-white/55 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          onClick={() => onSelect(location)}
        >
          <span className="block font-semibold">{location.name}</span>
          <span className="block text-xs text-[#151A21]/55 dark:text-white/45">
            {[location.admin1, location.country].filter(Boolean).join(', ')}
          </span>
        </button>
      ))}
    </div>
  )
}

function formatWeatherLocation(location: WeatherLocation) {
  return [location.name, location.admin1, location.country]
    .filter(Boolean)
    .join(', ')
}
