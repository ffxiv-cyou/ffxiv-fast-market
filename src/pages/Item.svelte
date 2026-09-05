<script lang="ts">
  import type { UniListing, UniResponse } from '../lib/market'
  import { fetchChinaCurrent, formatPrice } from '../lib/market'
  import { ensureCatalog, itemMeta } from '../lib/catalog'
  import { filter, setDc, setWorld } from '../lib/filterStore'
  import { DC_NAMES, worldToDc, worldsOf } from '../lib/worlds'

  let { id }: { id: number } = $props()

  let res = $state<UniResponse | null>(null)
  let loading = $state(false)
  let error = $state('')
  let reload = $state(0)
  let title = $state('')
  let cat = $state('')
  let il = $state<number | undefined>(undefined)
  let known = $state(false)

  const worldOptions = $derived(worldsOf($filter.dc))

  const rowsNq = $derived(selectRows(false, $filter.dc, $filter.world))
  const rowsHq = $derived(selectRows(true, $filter.dc, $filter.world))

  function selectRows(wantHq: boolean, dc: string, world: string): UniListing[] {
    const list = res?.listings ?? []
    const out = list.filter((item) => {
      if (Boolean(item.hq) !== wantHq) return false
      const w = item.worldName ?? ''
      if (world) return w === world
      if (dc) return worldToDc(w) === dc
      return true
    })
    out.sort((a, b) => (a.pricePerUnit ?? Infinity) - (b.pricePerUnit ?? Infinity))
    return out
  }

  $effect(() => {
    const currentId = id
    void reload
    let cancelled = false
    loading = true
    error = ''
    res = null
    fetchChinaCurrent(currentId)
      .then((data) => {
        if (!cancelled) res = data
      })
      .catch((err: unknown) => {
        if (!cancelled) error = err instanceof Error ? err.message : '请求失败，请稍后重试'
      })
      .finally(() => {
        if (!cancelled) loading = false
      })
    return () => {
      cancelled = true
    }
  })

  $effect(() => {
    const currentId = id
    ensureCatalog()
      .then(() => {
        const meta = itemMeta(currentId)
        title = meta?.name ?? ''
        cat = meta?.category ?? ''
        il = meta?.il
        known = !!meta?.name
      })
      .catch(() => {
        title = ''
        cat = ''
        il = undefined
        known = false
      })
  })

  function pad(value: number): string {
    return String(value).padStart(2, '0')
  }

  function fmtClock(ms: number | undefined): string {
    if (ms == null) return ''
    const d = new Date(ms)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  function emptyHint(wantHq: boolean): string {
    const quality = wantHq ? 'HQ' : 'NQ'
    return $filter.dc || $filter.world ? `当前筛选下暂无${quality}在售` : `暂无${quality}在售`
  }
</script>

<header class="item-head">
  <h1 class="item-name">{title || `物品 #${id}`}</h1>
  <span class="item-id">物品 ID：{id}</span>
  <div class="head-links">
    <a
      class="ext-link"
      href={`https://universalis.app/market/${id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Universalis ↗
    </a>
    {#if known}
      <a
        class="ext-link"
        href={`https://ff14.huijiwiki.com/wiki/物品:${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Wiki ↗
      </a>
    {/if}
  </div>
</header>

{#if cat || il}
  <div class="item-tags">
    {#if cat}
      <span class="tag tag-cat">{cat}</span>
    {/if}
    {#if il}
      <span class="tag tag-il">品级 {il}</span>
    {/if}
  </div>
{/if}

{#if loading && !res}
  <p class="state-hint">正在获取行情…</p>
{:else if error}
  <div class="state-error">
    <p>{error}</p>
    <button class="secondary" onclick={() => reload++}>重试</button>
  </div>
{:else if res && (res.listings ?? []).length === 0}
  <p class="state-hint">全区暂无在售数据，或该物品不在交易板收录范围内</p>
{:else if res}
  <div class="meta-row">
    {#if res.lastUploadTime}
      <span>数据更新于 {fmtClock(res.lastUploadTime)}</span>
    {/if}
    <span>全服在售 {res.listings?.length ?? 0} 笔</span>
  </div>

  <div class="toolbar">
    <div class="toolbar-field">
      <span class="toolbar-label">大区</span>
      <div class="chip-row" aria-label="大区筛选">
        <button
          type="button"
          class:active={$filter.dc === ''}
          onclick={() => setDc('')}
        >
          全部大区
        </button>
        {#each DC_NAMES as dcName (dcName)}
          <button
            type="button"
            class:active={$filter.dc === dcName}
            onclick={() => setDc(dcName)}
          >
            {dcName}
          </button>
        {/each}
      </div>
    </div>
    <div class="toolbar-field">
      <span class="toolbar-label">服务器</span>
      {#if $filter.dc}
        <div class="chip-row" aria-label="服务器筛选">
          <button
            type="button"
            class:active={$filter.world === ''}
            onclick={() => setWorld('')}
          >
            全部
          </button>
          {#each worldOptions as world (world)}
            <button
              type="button"
              class:active={$filter.world === world}
              onclick={() => setWorld(world)}
            >
              {world}
            </button>
          {/each}
        </div>
      {:else}
        <div class="chip-hint">选择上方大区后，可在此筛选单个服务器</div>
      {/if}
    </div>
  </div>

  <div class="panes">
    <section class="pane">
      <header class="pane-head">
        <span class="pane-tag hq">HQ</span>
        <span class="pane-count">{rowsHq.length} 笔</span>
      </header>
      {#if rowsHq.length === 0}
        <p class="pane-empty">{emptyHint(true)}</p>
      {:else}
        <div class="pane-scroll">
          <table class="ffm-table">
            <thead>
              <tr>
                <th class="cell-server">服务器</th>
                <th class="num">单价</th>
                <th class="num">数量</th>
              </tr>
            </thead>
            <tbody>
              {#each rowsHq as item, i (i)}
                <tr>
                  <td class="cell-server">
                    <span class="world-name">{item.worldName ?? '—'}</span>
                    {#if !$filter.dc}
                      <span class="world-dc">{worldToDc(item.worldName ?? '') ?? ''}</span>
                    {/if}
                  </td>
                  <td class="num price">{formatPrice(item.pricePerUnit)}</td>
                  <td class="num">{item.quantity ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <section class="pane">
      <header class="pane-head">
        <span class="pane-tag nq">NQ</span>
        <span class="pane-count">{rowsNq.length} 笔</span>
      </header>
      {#if rowsNq.length === 0}
        <p class="pane-empty">{emptyHint(false)}</p>
      {:else}
        <div class="pane-scroll">
          <table class="ffm-table">
            <thead>
              <tr>
                <th class="cell-server">服务器</th>
                <th class="num">单价</th>
                <th class="num">数量</th>
              </tr>
            </thead>
            <tbody>
              {#each rowsNq as item, i (i)}
                <tr>
                  <td class="cell-server">
                    <span class="world-name">{item.worldName ?? '—'}</span>
                    {#if !$filter.dc}
                      <span class="world-dc">{worldToDc(item.worldName ?? '') ?? ''}</span>
                    {/if}
                  </td>
                  <td class="num price">{formatPrice(item.pricePerUnit)}</td>
                  <td class="num">{item.quantity ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  </div>
{/if}
