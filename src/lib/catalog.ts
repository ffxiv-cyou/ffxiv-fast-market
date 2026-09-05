import { get, writable } from 'svelte/store'
import { readingsOf } from './pinyin'

type CatalogStatus = 'loading' | 'ready' | 'error'

export const catalogStatus = writable<CatalogStatus>('loading')

export interface ItemMeta {
  id: number
  name: string
  category: string
  il?: number
}

export interface SearchResult extends ItemMeta {
  py: string
}

interface Entry {
  id: number
  name: string
  category: string
  il?: number
  plain: string
  py: string
  pys: string[]
  inis: string[]
}

interface RawItem {
  id?: number
  name?: string
  category?: number
  il?: number
}

const MAX_COMBOS = 32
const MAX_RESULTS = 12

let ENTRIES: Entry[] = []
let loadingPromise: Promise<void> | null = null

function cartesian(opts: string[][], cap: number): string[] {
  let out = ['']
  outer: for (const group of opts) {
    if (group.length === 0) continue
    const next: string[] = []
    for (const prefix of out) {
      for (const syllable of group) {
        next.push(prefix + syllable)
        if (next.length >= cap) break outer
      }
    }
    out = next
    if (out.length >= cap) break
  }
  return out
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)]
}

function normalizeItems(data: unknown): RawItem[] {
  if (Array.isArray(data)) {
    return data
      .filter((item): item is RawItem => !!item && typeof item === 'object')
      .map((item) => item as RawItem)
  }
  if (data && typeof data === 'object') {
    const out: RawItem[] = []
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        out.push({ ...(value as RawItem), id: Number(key) || (value as RawItem).id })
      } else if (typeof value === 'string') {
        out.push({ id: Number(key), name: value })
      }
    }
    return out
  }
  return []
}

function buildEntries(items: RawItem[], catNames: Map<number, string>): void {
  const entries: Entry[] = []
  for (const raw of items) {
    const id = Number(raw.id)
    const name = (raw.name ?? '').trim()
    if (!Number.isInteger(id) || id <= 0 || !name) continue
    const category = Number(raw.category)
    const catId = Number.isFinite(category) && category > 0 ? category : undefined
    const ilNum = Number(raw.il)
    const il = Number.isFinite(ilNum) && ilNum > 0 ? ilNum : undefined
    const readings = readingsOf(name)
    const opts = readings
      .map((group) => group.map((s) => s.toLowerCase()))
      .filter((group) => group.length > 0)
    const py = opts.map((group) => group[0]).join(' ')
    const pys = dedupe(cartesian(opts, MAX_COMBOS))
    const iniOpts = opts.map((group) => group.map((s) => s.charAt(0) || ''))
    const inis = dedupe(cartesian(iniOpts, MAX_COMBOS))
    entries.push({
      id,
      name,
      category: catId != null ? catNames.get(catId) ?? '' : '',
      il,
      plain: name.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase(),
      py,
      pys,
      inis,
    })
  }
  ENTRIES = entries
}

export function ensureCatalog(): Promise<void> {
  if (ENTRIES.length > 0 || get(catalogStatus) === 'ready') return Promise.resolve()
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    catalogStatus.set('loading')
    try {
      const base = import.meta.env.BASE_URL
      const [marketRes, catRes] = await Promise.all([
        fetch(`${base}data/market.json`),
        fetch(`${base}data/categories.json`).catch(() => null),
      ])
      if (!marketRes.ok) throw new Error(`数据加载失败（HTTP ${marketRes.status}）`)
      const items = normalizeItems(await marketRes.json())
      const catNames = new Map<number, string>()
      if (catRes && catRes.ok) {
        const json = (await catRes.json()) as unknown
        if (json && typeof json === 'object') {
          for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
            const id = Number(key)
            if (Number.isInteger(id) && typeof value === 'string' && value) {
              catNames.set(id, value)
            }
          }
        }
      }
      buildEntries(items, catNames)
      catalogStatus.set('ready')
    } catch (err) {
      catalogStatus.set('error')
      loadingPromise = null
      throw err
    }
  })()
  return loadingPromise
}

export function itemMeta(id: number): ItemMeta | undefined {
  const found = ENTRIES.find((e) => e.id === id)
  if (!found) return undefined
  return { id: found.id, name: found.name, category: found.category, il: found.il }
}

export function itemName(id: number): string | undefined {
  return itemMeta(id)?.name
}

function scoreAscii(e: Entry, q: string): number {
  if (e.pys.includes(q)) return 0
  if (e.inis.includes(q)) return 1
  if (e.pys.some((p) => p.startsWith(q))) return 2
  if (e.inis.some((p) => p.startsWith(q))) return 3
  if (e.pys.some((p) => p.includes(q))) return 4
  if (e.inis.some((p) => p.includes(q))) return 5
  return -1
}

function scoreText(e: Entry, q: string): number {
  if (e.plain === q) return 0
  if (e.plain.startsWith(q)) return 1
  if (e.plain.includes(q)) return 2
  return -1
}

export function searchItems(queryRaw: string): SearchResult[] {
  const q = queryRaw.trim().toLowerCase().replace(/\s+/g, '')
  if (!q) return []
  const pureAscii = /^[a-z0-9]+$/.test(q) && /[a-z]/.test(q)
  const qPlain = pureAscii ? '' : q.replace(/[^\p{L}\p{N}]/gu, '')

  const scored: { entry: Entry; score: number }[] = []
  for (const entry of ENTRIES) {
    const score = pureAscii ? scoreAscii(entry, q) : scoreText(entry, qPlain)
    if (score >= 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.entry.name.length !== b.entry.name.length) return a.entry.name.length - b.entry.name.length
    return a.entry.name.localeCompare(b.entry.name, 'zh-CN')
  })

  return scored.slice(0, MAX_RESULTS).map(({ entry }) => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    il: entry.il,
    py: entry.py,
  }))
}
