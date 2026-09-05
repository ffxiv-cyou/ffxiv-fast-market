import { writable } from 'svelte/store'
import { DC_NAMES, worldsOf } from './worlds'

export interface Filter {
  dc: string
  world: string
}

const KEY = 'fffm.filter.v1'

function sanitize(raw: unknown): Filter {
  const fallback: Filter = { dc: '', world: '' }
  if (typeof raw !== 'object' || raw === null) return fallback
  const obj = raw as Record<string, unknown>
  const dc = typeof obj.dc === 'string' ? obj.dc : ''
  if (!dc || !DC_NAMES.includes(dc)) return fallback
  const world = typeof obj.world === 'string' && worldsOf(dc).includes(obj.world) ? obj.world : ''
  return { dc, world }
}

function load(): Filter {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return sanitize(JSON.parse(raw))
  } catch {
    // ignore
  }
  return { dc: '', world: '' }
}

export const filter = writable<Filter>(load())

filter.subscribe((value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // ignore
  }
})

export function setDc(dc: string): void {
  filter.update((current) => ({
    dc,
    world: dc && current.world && worldsOf(dc).includes(current.world) ? current.world : '',
  }))
}

export function setWorld(world: string): void {
  filter.update((current) => ({ ...current, world }))
}
