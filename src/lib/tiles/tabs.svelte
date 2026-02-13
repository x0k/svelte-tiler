<script lang="ts" module>
  import { getContext, setContext, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { createAttachmentKey } from 'svelte/attachments';

  import type { Draggable } from '$lib/shared/dnd.svelte.js';
  import type { Registry } from '$lib/shared/registry.js';
  import {
    insertWithDeduplication,
    type Tile,
    type Tiles,
  } from '$lib/model.js';
  import type { TilerContext } from '$lib/context.js';

  export type HeadersDirection = Direction | 'none';

  declare module '../model.js' {
    interface TileRegistry {
      tabs: {
        titles: string[];
        selectedTab: number;
        headersDirection: HeadersDirection;
        // TODO: Make required in v1
        edgeRatio?: number;
        actions?: string;
        tabHeader?: string;
        empty?: string;
      };
    }
    interface TileInsertRequirements {
      tabs: 'titles';
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
    edgeRatio?: number;
    selectedTab?: number;
    actions?: A;
    tabHeader?: H;
    empty?: E;
  }

  export const DEFAULT_EDGE_RATIO = 0.1;
  export const DROPPABLE_ATTACHMENT_KEY = createAttachmentKey();
  export const DRAGGABLE_ATTACHMENT_KEY = createAttachmentKey();

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
      edgeRatio: options.edgeRatio ?? DEFAULT_EDGE_RATIO,
      headersDirection: options.headersDirection ?? 'none',
      selectedTab: options.selectedTab ?? 0,
      actions: options.actions,
      tabHeader: options.tabHeader,
      empty: options.empty,
    };
  }

  interface SplitOptions {
    type: Direction;
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
    applySplit?: (options: SplitOptions) => void;
    actions?: Registry<A, Snippet<[Tiles['tabs']]> | undefined>;
    headers?: Registry<
      H,
      | Snippet<
          [HTMLAttributes<HTMLElement>, Tiles['tabs'], number, Draggable<Tile>]
        >
      | undefined
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

  export function onInsert(
    _ctx: TilerContext,
    tile: Tiles['tabs'],
    i: number,
    data: TileInsertData<'tabs'>
  ) {
    tile.selectedTab = insertWithDeduplication<'tabs'>(tile, i, {
      titles: data.titles,
      children: data.children,
    });
  }
</script>

<script lang="ts">
  import {
    getRectParts,
    type Direction,
    type EdgePart,
  } from '$lib/shared/spatial.js';
  import { getTilerContext } from '$lib/context.js';
  import type { TileInsertData, TileProps } from '$lib/model.js';
  import { TileDragSource, TileDropTarget } from '$lib/dnd.js';

  let { tile = $bindable(), parent, child }: TileProps<'tabs'> = $props();

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
  const edgeRatio = $derived(
    tabsCtx?.applySplit ? (tile.edgeRatio ?? DEFAULT_EDGE_RATIO) : 0
  );

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
      ctx.insertInto<'tabs'>(tile, tile.children.length, tabs);
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
      ctx.insertInto<'tabs'>(tile, i, tabs);
    }
  }

  class SegmentedContentDropTarget extends SegmentedTabsTileDropTarget {
    get isCenter() {
      return this.hpart === 'center' && this.vpart === 'center';
    }

    getTargetTileId(): string | undefined {
      return this.isCenter ? tile.id : parent?.id;
    }

    protected onDrop(tabs: Tiles['tabs'], d: Draggable): void {
      const id = tabs.children[0].id;
      if (this.isCenter) {
        let i = tile.children.findIndex((t) => t.id === id);
        if (i < 0 && this.isOwnChild(d)) {
          i = d.childIndex;
        }
        ctx.insertInto<'tabs'>(tile, i < 0 ? tile.children.length : i, tabs);
      } else if (tabsCtx?.applySplit) {
        tabsCtx.applySplit({
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

{#snippet defaultTabHeader(
  props: HTMLAttributes<HTMLElement>,
  t: Tiles['tabs'],
  index: number
)}
  <div {...props}>
    {t.titles[index]}
  </div>
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
          {@const props = {
            [DROPPABLE_ATTACHMENT_KEY]: droppable.register,
            [DRAGGABLE_ATTACHMENT_KEY]: draggable.register,
            'data-tabs-header': '',
            role: 'tab',
            tabindex: 0,
            onclick: () => (tile.selectedTab = i),
            onkeydown: handleKeydown,
            get 'aria-selected'() {
              return tile.selectedTab === i;
            },
            get 'data-dragged'() {
              return draggable.isDragged;
            },
            get 'data-over'() {
              return droppable.isOver;
            },
            get 'data-hpart'() {
              return droppable.hpart;
            },
            get 'data-vpart'() {
              return droppable.vpart;
            },
          } satisfies HTMLAttributes<HTMLElement>}
          {@render tabHeader(props, tile, i, draggable)}
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
  :global [data-tabs-header] {
    user-select: none;
    cursor: pointer;
    &[data-dragged='true'] {
      cursor: grabbing;
    }
  }
</style>
