<script lang="ts">
  import { onMount } from 'svelte'
  import type { Route } from './lib/router'
  import { parseRoute } from './lib/router'
  import { ensureCatalog } from './lib/catalog'
  import Home from './pages/Home.svelte'
  import Item from './pages/Item.svelte'

  let route = $state<Route>(parseRoute())

  onMount(() => {
    ensureCatalog().catch(() => {})
    const sync = () => {
      route = parseRoute()
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  })

  $effect(() => {
    if (route.name === 'item') document.title = `#${route.id} · FFXIV 市场快查`
    else if (route.name === 'missing') document.title = '页面不存在 · FFXIV 市场快查'
    else document.title = 'FFXIV 市场快查'
  })
</script>

<div class="site">
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="#/">FFXIV 市场快查</a>
      {#if route.name === 'item'}
        <a class="back-link" href="#/">← 返回搜索</a>
      {/if}
    </div>
  </header>

  <main class="site-main {route.name === 'item' ? 'wide' : 'narrow'}">
    {#if route.name === 'home'}
      <Home />
    {:else if route.name === 'item'}
      <Item id={route.id} />
    {:else}
      <section class="missing">
        <h1>页面不存在</h1>
        <p>未找到该页面，可能是链接有误或物品不存在。</p>
        <a href="#/">回到首页</a>
      </section>
    {/if}
  </main>

  <footer class="site-footer">行情数据来自 Universalis · 价格由玩家上传，可能延迟或不完整</footer>
</div>
