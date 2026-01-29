<script lang="ts" module>
  import { getContext, setContext, type Snippet } from 'svelte';

  import type { Draggable } from '$lib/shared/dnd.svelte.js';
  import type { Registry } from '$lib/shared/registry.js';
  import type { Tile, Tiles } from '$lib/model.js';
  import type { TilerContext } from '$lib/context.js';

  export type HeadersDirection = Direction | 'none';

  declare module '../model.js' {
    interface TileRegistry {
      tabs: {
        titles: string[];
        selectedTab: number;
        headersDirection: HeadersDirection;
        actions?: string;
        tabHeader?: string;
        empty?: string;
      };
    }
  }

  export interface TabsOptions<
    H extends string,
    E extends string,
    A extends string,
  > {
    tabs: [string, Tile][];
    /** @default "none" */
    headersDirection?: HeadersDirection;
    selectedTab?: number;
    actions?: A;
    tabHeader?: H;
    empty?: E;
  }

  export function create<H extends string, E extends string, A extends string>(
    options: TabsOptions<H, E, A>
  ): Tiles['tabs'] {
    const children: Tile[] = [];
    const titles: string[] = [];
    for (const tab of options.tabs) {
      titles.push(tab[0]);
      children.push(tab[1]);
    }
    return {
      id: crypto.randomUUID(),
      type: 'tabs',
      children,
      titles,
      headersDirection: options.headersDirection ?? 'none',
      selectedTab: options.selectedTab ?? 0,
      actions: options.actions,
      tabHeader: options.tabHeader,
      empty: options.empty,
    };
  }

  interface SplitOptions {
    type: 'row' | 'column';
    parent: Tile | undefined;
    pivot: Tiles['tabs'];
    offset: number;
    adjacent: Tiles['tabs'];
  }

  interface TabsContext<
    H extends string = string,
    E extends string = string,
    A extends string = string,
  > {
    createSplit?: (options: SplitOptions) => Tile;
    actions?: Registry<A, Snippet<[Tiles['tabs']]> | undefined>;
    headers?: Registry<
      H,
      Snippet<[Tiles['tabs'], number, Draggable<Tile>]> | undefined
    >;
    empty?: Registry<E, Snippet<[Tiles['tabs']]> | undefined>;
  }

  const TABS_CONTEXT_KEY = Symbol('tabs-context-key');

  export function setup<H extends string, E extends string, A extends string>(
    ctx: TabsContext<H, E, A>
  ) {
    setContext(TABS_CONTEXT_KEY, ctx);
    return create<H, E, A>;
  }

  export function onRemoveChild(
    ctx: TilerContext,
    tile: Tiles['tabs'],
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

  export function onClear(_ctx: TilerContext, tile: Tiles['tabs']) {
    if (tile.children.length > 0) {
      tile.selectedTab = -1;
      tile.children.length = 0;
      tile.titles.length = 0;
    }
  }

  export function insertTabs(
    tile: Tiles['tabs'],
    i: number,
    {
      titles,
      children,
    }: {
      titles: string[];
      children: Tile[];
    }
  ) {
    const newIds = new Set(children.map((c) => c.id));
    let write = 0;
    let shift = 0;
    const c = tile.children;
    const t = tile.titles;
    const l = t.length;
    for (let read = 0; read < l; read++) {
      if (!newIds.has(c[read].id)) {
        t[write] = t[read];
        c[write] = c[read];
        write++;
      } else if (read < i) {
        shift++;
      }
    }
    c.length = write;
    t.length = write;
    i -= shift;
    tile.children.splice(i, 0, ...children);
    tile.titles.splice(i, 0, ...titles);
    tile.selectedTab = i;
  }
</script>

<script lang="ts">
  import {
    getRectParts,
    type Direction,
    type EdgePart,
  } from '$lib/shared/spatial.js';
  import { getTilerContext } from '$lib/context.js';
  import type { TileProps } from '$lib/model.js';
  import { TileDragSource, TileDropTarget } from '$lib/dnd.js';

  let {
    tile = $bindable(),
    parent = $bindable(),
    child,
  }: TileProps<'tabs'> = $props();

  const ctx = getTilerContext();
  const tabsCtx = getContext<TabsContext | undefined>(TABS_CONTEXT_KEY);

  const actions = $derived(
    (tile.actions !== undefined && tabsCtx?.actions?.get(tile.actions)) ||
      undefined
  );
  const tabHeader = $derived(
    (tile.tabHeader !== undefined && tabsCtx?.headers?.get(tile.tabHeader)) ||
      defaultTabHeader
  );
  const empty = $derived(
    (tile.empty !== undefined && tabsCtx?.empty?.get(tile.empty)) || undefined
  );
  const edgeRatio = $derived(tabsCtx?.createSplit ? 0.1 : 0);

  class TabsTileDropTarget extends TileDropTarget<Tiles['tabs']> {
    accepts(d: Draggable<Tile>): d is Draggable<Tiles['tabs']> {
      const t = d.data;
      return (
        t?.type === 'tabs' &&
        !(
          this.isOwnChild(d) &&
          t.children.length === 1 &&
          tile.children.length === 1 &&
          t.children[0].id === tile.children[0].id
        )
      );
    }
  }

  class SimpleTabsDropTarget extends TabsTileDropTarget {
    protected onDrop(tabs: Tiles['tabs']): void {
      insertTabs(tile, tile.children.length, tabs);
    }
  }

  class SegmentedTabsTileDropTarget extends TabsTileDropTarget {
    #edgeRatio: number;
    hpart: EdgePart | undefined = $state.raw();
    vpart: EdgePart | undefined = $state.raw();

    constructor(ctx: TilerContext, edgeRatio: number) {
      super(ctx, tile.id);
      this.#edgeRatio = edgeRatio;
    }

    onMove(e: PointerEvent) {
      const rect = this.element!.getBoundingClientRect();
      Object.assign(
        this,
        getRectParts(rect, e.clientX, e.clientY, this.#edgeRatio)
      );
    }
  }

  class SegmentedTabDropTarget extends SegmentedTabsTileDropTarget {
    #id: string;
    #index: number;

    constructor(ctx: TilerContext, id: string, index: number) {
      super(ctx, tile.headersDirection === 'none' ? 0 : 0.5);
      this.#id = id;
      this.#index = index;
    }

    protected onDrop(tabs: Tiles['tabs'], d: Draggable): void {
      let i = tile.children.findIndex((c) => c.id === this.#id);
      if (i < 0) {
        i = this.#index;
      } else if (
        tile.headersDirection !== 'none'
          ? (tile.headersDirection === 'row' ? this.hpart : this.vpart) ===
            'end'
          : this.isOwnChild(d) && d.childIndex <= i
      ) {
        i++;
      }
      insertTabs(tile, i, tabs);
    }
  }

  class SegmentedContentDropTarget extends SegmentedTabsTileDropTarget {
    protected onDrop(tabs: Tiles['tabs'], d: Draggable): void {
      const id = tabs.children[0].id;
      if (this.hpart === 'center' && this.vpart === 'center') {
        let i = tile.children.findIndex((t) => t.id === id);
        if (i < 0 && this.isOwnChild(d)) {
          i = d.childIndex;
        }
        insertTabs(tile, i < 0 ? tile.children.length : i, tabs);
      } else if (tabsCtx?.createSplit) {
        parent = tabsCtx.createSplit({
          parent,
          type:
            this.hpart === 'start' || this.hpart === 'end' ? 'row' : 'column',
          pivot: tile,
          adjacent: tabs,
          offset:
            this.hpart === 'start'
              ? 0
              : this.hpart === 'end'
                ? 1
                : this.vpart === 'start'
                  ? 0
                  : 1,
        });
      }
    }
  }

  function handleKeydown(e: KeyboardEvent & { currentTarget: HTMLElement }) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  }

  const droppableSpacer = $derived(new SimpleTabsDropTarget(ctx, tile.id));
  const droppableContent = $derived(
    new SegmentedContentDropTarget(ctx, edgeRatio)
  );
  const droppableEmpty = $derived(
    new SegmentedContentDropTarget(ctx, edgeRatio)
  );
</script>

{#snippet defaultTabHeader(t: Tiles['tabs'], index: number)}
  {t.titles[index]}
{/snippet}

<div data-tabs>
  {#if tile.children[tile.selectedTab]}
    <div data-tabs-bar>
      <div data-tabs-list>
        {#each tile.children as t, i (t.id)}
          {@const droppable = new SegmentedTabDropTarget(ctx, t.id, i)}
          {@const draggable = new TileDragSource(ctx, {
            parentTileId: tile.id,
            childIndex: i,
            data: create({
              ...tile,
              tabs: [[tile.titles[i], t]],
              selectedTab: 0,
            }),
          })}
          <div
            data-tabs-header
            {@attach droppable.register}
            {@attach draggable.register}
            role="tab"
            tabindex="0"
            onclick={() => (tile.selectedTab = i)}
            onkeydown={handleKeydown}
            data-dragged={draggable.isDragged}
            data-over={droppable.isOver}
            aria-selected={tile.selectedTab === i}
            data-hpart={droppable.hpart}
            data-vpart={droppable.vpart}
          >
            {@render tabHeader(tile, i, draggable)}
          </div>
        {/each}
      </div>
      <div
        data-tabs-spacer
        {@attach droppableSpacer.register}
        data-over={droppableSpacer.isOver}
      ></div>
      <div data-tabs-actions>
        {@render actions?.(tile)}
      </div>
    </div>
    <div
      data-tabs-content
      {@attach droppableContent.register}
      data-over={droppableContent.isOver}
      data-hpart={droppableContent.hpart}
      data-vpart={droppableContent.vpart}
    >
      {@render child(tile.selectedTab)}
    </div>
  {:else}
    <div
      data-tabs-empty
      {@attach droppableEmpty.register}
      data-over={droppableEmpty.isOver}
      data-hpart={droppableEmpty.hpart}
      data-vpart={droppableEmpty.vpart}
    >
      {@render empty?.(tile)}
    </div>
  {/if}
</div>

<style>
  [data-tabs-header] {
    user-select: none;
    cursor: pointer;
    &[data-dragged='true'] {
      cursor: grabbing;
    }
  }
</style>
