export type Route =
  | { name: 'home' }
  | { name: 'item'; id: number }
  | { name: 'missing' }

export function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '')
  const parts = hash.split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'home' }
  if (parts[0] === 'item' && parts.length >= 2) {
    const id = Number(parts[1])
    if (Number.isInteger(id) && id > 0) return { name: 'item', id }
  }
  return { name: 'missing' }
}

export function goHome(): void {
  window.location.hash = '/'
}

export function goItem(id: number): void {
  window.location.hash = `/item/${id}`
}
