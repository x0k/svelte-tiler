<script lang="ts" module>
  import { getContext, setContext, type Snippet } from 'svelte';

  import type { Registry } from '$lib/shared/registry.js';
  import {
    insertWithDeduplication,
    type Tile,
    type TileInsertData,
    type TileProps,
    type Tiles,
  } from '$lib/model.js';
  import type { TilerContext } from '$lib/context.js';

  declare module '../model.js' {
    interface TileRegistry {
      stabs: {
        titles: string[];
        selectedTab: number;
        bar: string;
        empty?: string;
      };
    }
    interface TileInsertRequirements {
      stabs: 'titles';
    }
  }

  export interface STabsOptions<B extends string, E extends string> {
    tabs: [string, Tile][];
    /** @default 0 */
    selectedTab?: number;
    bar: B;
    empty?: E;
  }

  interface STabsContext<B extends string = string, E extends string = string> {
    bars: Registry<
      B,
      Snippet<[Tiles['stabs'], number, Tile | undefined]> | undefined
    >;
    empty?: Registry<
      E,
      Snippet<[Tiles['stabs'], number, Tile | undefined]> | undefined
    >;
  }

  const STABS_CONTEXT_KEY = Symbol('stabs-context-key');

  export function setup<B extends string, E extends string>(
    ctx: STabsContext<B, E>
  ) {
    setContext(STABS_CONTEXT_KEY, ctx);
    return (options: STabsOptions<B, E>): Tiles['stabs'] => {
      const children: Tile[] = [];
      const titles: string[] = [];
      for (const tab of options.tabs) {
        titles.push(tab[0]);
        children.push(tab[1]);
      }
      return {
        id: crypto.randomUUID(),
        type: 'stabs',
        titles,
        children,
        bar: options.bar,
        selectedTab: options.selectedTab ?? 0,
        empty: options.empty,
      };
    };
  }

  export function onRemoveChild(
    ctx: TilerContext,
    tile: Tiles['stabs'],
    i: number
  ) {
    if (tile.children.length < 2) {
      ctx.remove(tile);
      return;
    }
    if (tile.selectedTab >= i) {
      tile.selectedTab = Math.max(0, tile.selectedTab - 1);
    }
    tile.children.splice(i, 1);
    tile.titles.splice(i, 1);
  }

  export function onClear(_ctx: TilerContext, tile: Tiles['stabs']) {
    if (tile.children.length > 0) {
      tile.selectedTab = -1;
      tile.children.length = 0;
      tile.titles.length = 0;
    }
  }

  export function onInsert(
    _ctx: TilerContext,
    tile: Tiles['stabs'],
    i: number,
    data: TileInsertData<'stabs'>
  ) {
    tile.selectedTab = insertWithDeduplication<'stabs'>(tile, i, {
      titles: data.titles,
      children: data.children,
    });
  }
</script>

<script lang="ts">
  let {
    tile = $bindable(),
    child,
    index,
    parent,
  }: TileProps<'stabs'> = $props();

  const tabsCtx = getContext<STabsContext>(STABS_CONTEXT_KEY);

  const bar = $derived(tabsCtx.bars.get(tile.bar));
  const empty = $derived(
    (tile.empty !== undefined && tabsCtx.empty?.get(tile.empty)) || undefined
  );
</script>

<div data-stabs>
  {@render bar?.(tile, index, parent)}
  {#if tile.children[tile.selectedTab]}
    {@render child(tile.selectedTab)}
  {:else}
    {@render empty?.(tile, index, parent)}
  {/if}
</div>
