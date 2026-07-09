import { describe, expect, it, vi } from 'vitest'

import { searchWeatherLocationQuery } from './search-location.query'

describe('searchWeatherLocationQuery', () => {
  it('loads and maps Open-Meteo geocoding results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            admin1: 'São Paulo',
            country: 'Brazil',
            id: 3448439,
            latitude: -23.55,
            longitude: -46.64,
            name: 'São Paulo',
            timezone: 'America/Sao_Paulo',
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const locations = await searchWeatherLocationQuery('São Paulo')
    const url = fetchMock.mock.calls[0][0] as URL

    expect(url.hostname).toBe('geocoding-api.open-meteo.com')
    expect(url.searchParams.get('name')).toBe('São Paulo')
    expect(url.searchParams.get('count')).toBe('8')
    expect(url.searchParams.get('language')).toBe('en')
    expect(url.searchParams.get('format')).toBe('json')
    expect(locations).toEqual([
      {
        admin1: 'São Paulo',
        country: 'Brazil',
        id: 3448439,
        latitude: -23.55,
        longitude: -46.64,
        name: 'São Paulo',
        timezone: 'America/Sao_Paulo',
      },
    ])
  })

  it('returns an empty list when the API has no results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    )

    await expect(searchWeatherLocationQuery('unknown')).resolves.toEqual([])
  })
})
