export interface UniListing {
  pricePerUnit?: number
  quantity?: number
  hq?: boolean
  worldName?: string
  worldID?: number
  total?: number
  tax?: number
  lastReviewTime?: number
  [key: string]: unknown
}

export interface UniResponse {
  itemID?: number
  dcName?: string
  worldName?: string
  lastUploadTime?: number
  hasData?: boolean
  listings?: UniListing[]
  recentHistory?: unknown[]
  [key: string]: unknown
}

const REGION = '中国'
const TTL = 60_000

interface CacheEntry {
  at: number
  res: UniResponse
}

const cache = new Map<number, CacheEntry>()
const inflight = new Map<number, Promise<UniResponse>>()

async function requestChina(id: number): Promise<UniResponse> {
  const url = `https://universalis.app/api/v2/${encodeURIComponent(REGION)}/${id}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`请求 Universalis 失败（HTTP ${res.status}）`)
  return (await res.json()) as UniResponse
}

export async function fetchChinaCurrent(id: number): Promise<UniResponse> {
  const now = Date.now()
  const hit = cache.get(id)
  if (hit && now - hit.at < TTL) return hit.res
  const running = inflight.get(id)
  if (running) return running
  const task = requestChina(id)
    .then((res) => {
      cache.set(id, { at: Date.now(), res })
      return res
    })
    .finally(() => {
      inflight.delete(id)
    })
  inflight.set(id, task)
  return task
}

export function formatPrice(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('en-US')
}
