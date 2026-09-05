<script lang="ts">
  import { onMount } from 'svelte'
  import type { SearchResult } from '../lib/catalog'
  import { catalogStatus, searchItems } from '../lib/catalog'
  import { goItem } from '../lib/router'

  let query = $state('')
  let open = $state(false)
  let active = $state(0)
  let inputEl: HTMLInputElement | undefined = $state()

  const results = $derived.by(() => {
    if ($catalogStatus !== 'ready') return []
    return searchItems(query)
  })
  const highlightIndex = $derived(Math.min(active, Math.max(results.length - 1, 0)))

  onMount(() => {
    inputEl?.focus()
  })

  function handleInput(event: Event): void {
    query = (event.currentTarget as HTMLInputElement).value
    active = 0
    open = query.trim().length > 0
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!open || results.length === 0) {
      if (event.key === 'Escape') open = false
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      active = (highlightIndex + 1) % results.length
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      active = (highlightIndex - 1 + results.length) % results.length
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = results[highlightIndex]
      if (target) choose(target)
    } else if (event.key === 'Escape') {
      open = false
    }
  }

  function choose(result: SearchResult): void {
    open = false
    goItem(result.id)
  }

  function handleFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null
    if (related && (event.currentTarget as HTMLElement).contains(related)) return
    open = false
  }
</script>

<section class="home-hero">
  <p class="home-title">FFXIV 市场快查</p>
  <p class="home-subtitle">按物品名 / 拼音 / 首字母查询国服跨大区在售行情</p>
</section>

<div class="search" onfocusout={handleFocusOut}>
  <input
    bind:this={inputEl}
    type="text"
    placeholder="输入名称、拼音或首字母，如：火之碎晶 / huozhisuijing / hzsj"
    aria-label="物品搜索"
    aria-autocomplete="list"
    value={query}
    oninput={handleInput}
    onkeydown={handleKeydown}
  />

  {#if open}
    {#if $catalogStatus === 'loading'}
      <p class="search-hint">正在加载物品数据…</p>
    {:else if $catalogStatus === 'error'}
      <p class="search-hint">物品数据加载失败，请刷新页面重试</p>
    {:else if results.length === 0}
      <p class="search-hint">未找到匹配的物品</p>
    {:else}
      <ul class="suggest" role="listbox" aria-label="搜索结果">
        {#each results as result, i (result.id)}
          <li class:active={i === highlightIndex} role="option" aria-selected={i === highlightIndex}>
            <button type="button" onclick={() => choose(result)}>
              <span class="suggest-main">
                <span class="suggest-name">{result.name}</span>
                {#if result.category || result.il}
                  <span class="suggest-tags">
                    {#if result.category}
                      <span class="tag tag-cat">{result.category}</span>
                    {/if}
                    {#if result.il}
                      <span class="tag tag-il">品级 {result.il}</span>
                    {/if}
                  </span>
                {/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

{#if $catalogStatus === 'loading'}
  <p class="home-footer-hint">数据文件加载约需片刻，检索在本地完成</p>
{/if}
