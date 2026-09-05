import pinyinliteImport from 'pinyinlite/index_full.js'

const pinyinlite: typeof pinyinliteImport =
  (pinyinliteImport as unknown as { default?: typeof pinyinliteImport }).default ??
  pinyinliteImport

export function readingsOf(text: string): string[][] {
  return pinyinlite(text, { keepUnrecognized: false })
}
