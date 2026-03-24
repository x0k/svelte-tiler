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
      tabs2: {
        titles: string[];
        selectedTab: number;
        bar: string;
        empty?: string;
      };
    }
    interface TileInsertRequirements {
      tabs2: 'titles';
    }
  }

  export interface Tabs2Options<B extends string, E extends string> {
    tabs: [string, Tile][];
    /** @default 0 */
    selectedTab?: number;
    bar: B;
    empty?: E;
  }

  interface Tabs2Context<B extends string = string, E extends string = string> {
    bars: Registry<
      B,
      Snippet<[Tiles['tabs2'], number, Tile | undefined]> | undefined
    >;
    empty?: Registry<
      E,
      Snippet<[Tiles['tabs2'], number, Tile | undefined]> | undefined
    >;
  }

  const TABS2_CONTEXT_KEY = Symbol('tabs2-context-key');

  export function setup<B extends string, E extends string>(
    ctx: Tabs2Context<B, E>
  ) {
    setContext(TABS2_CONTEXT_KEY, ctx);
    return (options: Tabs2Options<B, E>): Tiles['tabs2'] => {
      const children: Tile[] = [];
      const titles: string[] = [];
      for (const tab of options.tabs) {
        titles.push(tab[0]);
        children.push(tab[1]);
      }
      return {
        id: crypto.randomUUID(),
        type: 'tabs2',
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
    tile: Tiles['tabs2'],
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

  export function onClear(_ctx: TilerContext, tile: Tiles['tabs2']) {
    if (tile.children.length > 0) {
      tile.selectedTab = -1;
      tile.children.length = 0;
      tile.titles.length = 0;
    }
  }

  export function onInsert(
    _ctx: TilerContext,
    tile: Tiles['tabs2'],
    i: number,
    data: TileInsertData<'tabs2'>
  ) {
    tile.selectedTab = insertWithDeduplication<'tabs2'>(tile, i, {
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
  }: TileProps<'tabs2'> = $props();

  const tabsCtx = getContext<Tabs2Context>(TABS2_CONTEXT_KEY);

  const bar = $derived(tabsCtx.bars.get(tile.bar));
  const empty = $derived(
    (tile.empty !== undefined && tabsCtx.empty?.get(tile.empty)) || undefined
  );
</script>

<div data-tabs2>
  {@render bar?.(tile, index, parent)}
  {#if tile.children[tile.selectedTab]}
    {@render child(tile.selectedTab)}
  {:else}
    {@render empty?.(tile, index, parent)}
  {/if}
</div>
