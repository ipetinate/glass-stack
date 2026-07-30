const BASE_URL = import.meta.env.VITE_API_BASE_URL

export type StorageVolume = { device: string; mountpoint: string; filesystem: string; totalBytes: number; usedBytes: number; freeBytes: number }
export type StorageDevice = { name: string; device: string; kind: string; mountpoints: string[] }
export type StorageSnapshot = { volumes: StorageVolume[]; devices: StorageDevice[] }

export async function fetchStorage(signal?: AbortSignal): Promise<StorageSnapshot> {
  const response = await fetch(`${BASE_URL}/api/v1/storage`, {
    credentials: 'include',
    signal,
  })
  if (!response.ok) throw new Error(`Failed to load storage: ${response.status}`)
  return response.json() as Promise<StorageSnapshot>
}
