declare module 'pinyinlite/index_full.js' {
  export default function pinyinlite(
    text: string,
    options?: { keepUnrecognized?: boolean },
  ): string[][]
}
