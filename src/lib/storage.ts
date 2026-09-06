/**
 * Thin, defensive wrapper around localStorage.
 *
 * Everything the app persists goes through here so that a future swap to a
 * backend (or to IndexedDB / a CRM sync layer) only touches this file and the
 * repositories in `src/data/repository`.
 */

const NAMESPACE = 'ccc'

export const storageKey = (name: string) => `${NAMESPACE}:${name}`

function isAvailable(): boolean {
  try {
    const probe = `${NAMESPACE}:__probe__`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** In-memory fallback for private-mode browsers or a full quota. */
const memoryStore = new Map<string, string>()
const available = typeof window !== 'undefined' && isAvailable()

export function readRaw(name: string): string | null {
  const key = storageKey(name)
  try {
    return available ? window.localStorage.getItem(key) : (memoryStore.get(key) ?? null)
  } catch {
    return memoryStore.get(key) ?? null
  }
}

export function writeRaw(name: string, value: string): boolean {
  const key = storageKey(name)
  try {
    if (available) {
      window.localStorage.setItem(key, value)
    } else {
      memoryStore.set(key, value)
    }
    return true
  } catch {
    memoryStore.set(key, value)
    return false
  }
}

export function removeRaw(name: string): void {
  const key = storageKey(name)
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  memoryStore.delete(key)
}

export function readJson<T>(name: string): T | null {
  const raw = readRaw(name)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    console.warn(`[storage] Corrupted entry for "${name}" — ignoring it.`)
    return null
  }
}

export function writeJson(name: string, value: unknown): boolean {
  try {
    return writeRaw(name, JSON.stringify(value))
  } catch {
    return false
  }
}

/** True when persistence is durable (i.e. not the in-memory fallback). */
export const storageIsDurable = available
