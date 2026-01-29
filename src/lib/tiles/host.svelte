<script lang="ts" module>
  import { getContext, setContext } from 'svelte';
  import {
    getRectParts,
    type Direction,
    type EdgePart,
  } from '$lib/shared/spatial.js';
  import type { Tile, Tiles } from '$lib/model.js';
  import { getTilerContext, type TilerContext } from '$lib/context.svelte.js';

  declare module '../model.js' {
    interface TileRegistry {
      host: {
        edgeRation: number;
      };
    }
  }

  export interface HostOptions {
    children: Tile[];
    edgeRation?: number;
  }

  export function create({
    children,
    edgeRation = 0.5,
  }: HostOptions): Tiles['host'] {
    return {
      id: crypto.randomUUID(),
      type: 'host',
      children,
      edgeRation,
    };
  }

  interface SplitOptions {
    type: Direction;
    parent: Tile | undefined;
    pivot: Tiles['host'];
    offset: number;
    adjacent: Tile;
  }

  interface HostContext {
    createSplit?: (options: SplitOptions) => void;
  }

  const HOST_CONTEXT_KEY = Symbol('host-context-key');

  export function setup(ctx: HostContext) {
    setContext(HOST_CONTEXT_KEY, ctx);
    return create;
  }

  export function onRemoveChild(
    ctx: TilerContext,
    tile: Tiles['host'],
    i: number
  ) {
    if (tile.children.length < 2) {
      ctx.destroy(tile);
      return;
    }
    tile.children.splice(i, 1);
  }

  export function onClear(_ctx: TilerContext, tile: Tiles['host']) {
    tile.children.length = 0;
  }
</script>

<script lang="ts">
  import { type TileProps } from '$lib/model.js';
  import { TileDropTarget } from '$lib/dnd.js';

  let {
    tile = $bindable(),
    parent = $bindable(),
    child,
  }: TileProps<'host'> = $props();

  const ctx = getTilerContext();
  const hostCtx = getContext<HostContext | undefined>(HOST_CONTEXT_KEY);

  const createSplit = $derived(hostCtx?.createSplit);

  const edgeRation = $derived(createSplit ? tile.edgeRation : 0);

  class DroppableHost extends TileDropTarget<Tile> {
    hpart: EdgePart | undefined = $state.raw();
    vpart: EdgePart | undefined = $state.raw();

    protected onMove(e: PointerEvent): void {
      const rect = this.element!.getBoundingClientRect();
      Object.assign(this, getRectParts(rect, e.clientX, e.clientY, edgeRation));
    }

    protected onDrop(newTile: Tile, d: Draggable): void {
      const id = newTile.children[0].id;
      if (this.hpart === 'center' && this.vpart === 'center') {
        let i = tile.children.findIndex((t) => t.id === id);
        if (i < 0 && d instanceof DraggableTab) {
          i = d.index;
        }
        insertTabs(tile, i < 0 ? tile.children.length : i, newTile);
      } else if (tabsCtx?.createSplit) {
        parent = tabsCtx.createSplit({
          parent,
          type:
            this.hpart === 'start' || this.hpart === 'end' ? 'row' : 'column',
          pivot: tile,
          adjacent: newTile,
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
</script>
