<script lang="ts" module>
  import { getContext, setContext, tick, type Snippet } from 'svelte';

  import type { Registry } from '$lib/shared/registry.js';
  import { DndContext, Draggable } from '$lib/shared/dnd.svelte.js';
  import {
    normalize,
    type Constraint,
    type NormalizedConstraints,
  } from '$lib/shared/constraints.js';
  import type { Direction } from '$lib/shared/spatial.js';
  import { almostEqual } from '$lib/shared/math.js';
  import {
    insertWithDeduplication,
    type Tile,
    type TileInsertData,
    type TileProps,
    type Tiles,
  } from '$lib/model.js';
  import type { TilerContext } from '$lib/context.js';
  import { TileDropTarget } from '$lib/dnd.js';

  declare module '../model.js' {
    interface TileRegistry {
      split: {
        constraints: Array<Constraint[]>;
        weights: number[];
        direction: Direction;
        resizer?: string;
        gapPx: number;
      };
    }
  }

  export interface SplitTileOptions {
    constraints?: Constraint[];
    weight?: number;
    tile: Tile;
  }

  export interface SplitOptions<R extends string> {
    children: SplitTileOptions[];
    resizer?: R;
    /** @default "row" */
    direction?: Direction;
    /** @default 0 */
    gapPx?: number;
  }

  export function create<R extends string>(
    options: SplitOptions<R>
  ): Tiles['split'] {
    const children: Tile[] = [];
    const weights: number[] = [];
    const constraints: Array<Constraint[]> = [];
    for (const c of options.children) {
      children.push(c.tile);
      weights.push(c.weight ?? 1);
      constraints.push(c.constraints ?? []);
    }
    return {
      id: crypto.randomUUID(),
      type: 'split',
      children,
      weights,
      constraints,
      direction: options.direction ?? 'row',
      resizer: options.resizer,
      gapPx: options.gapPx ?? 0,
    };
  }

  const SPLIT_CONTEXT_KEY = Symbol('split-context-key');

  type SplitContext<R extends string = string> = {
    resizer?: Registry<
      R,
      Snippet<[Draggable, Tiles['split'], number]> | undefined
    >;
  };

  export function setup<R extends string>(ctx: SplitContext<R>) {
    setContext(SPLIT_CONTEXT_KEY, ctx);
    return create<R>;
  }

  export function onRemoveChild(
    ctx: TilerContext,
    tile: Tiles['split'],
    i: number
  ) {
    if (tile.children.length === 2) {
      const droppable =
        ctx.dnd.targetId && ctx.dnd.droppables.get(ctx.dnd.targetId);
      if (
        !droppable ||
        (droppable instanceof TileDropTarget &&
          tile.id !== droppable.getTargetTileId())
      ) {
        tick().then(() => {
          ctx.replace(tile, tile.children[1 - i]);
        });
        return;
      }
    }
    if (tile.children.length > 1) {
      tile.children.splice(i, 1);
      tile.weights.splice(i, 1);
      tile.constraints.splice(i, 1);
      return;
    }
    ctx.remove(tile);
  }

  export function onClear(_ctx: TilerContext, _tile: Tiles['split']) {}

  export function onInsert(
    _ctx: TilerContext,
    tile: Tiles['split'],
    index: number,
    {
      children,
      constraints = children.map(() => []),
      weights = children.map(() => 1),
    }: TileInsertData<'split'>
  ) {
    insertWithDeduplication<'split'>(tile, index, {
      children,
      constraints,
      weights,
    });
  }
</script>

<script lang="ts">
  let { tile = $bindable(), child }: TileProps<'split'> = $props();

  const splitCtx = getContext<SplitContext | undefined>(SPLIT_CONTEXT_KEY);
  const dndCtx = new DndContext();

  const resizerSnippet = $derived(
    (tile.resizer !== undefined && splitCtx?.resizer?.get(tile.resizer)) ||
      undefined
  );

  let splitEl: HTMLDivElement;
  let resizerEl: HTMLElement;

  const isRow = $derived(tile.direction === 'row');
  let posDiff = 0;
  let containerSize = 0;
  let remaining = 0;
  let totalWeight = 0;
  let len = 0;
  let constraints: NormalizedConstraints[] = [];

  let nextLayout: number[] = [];

  function getNextLayoutTotalWidth() {
    let s = 0;
    for (let i = 0; i < nextLayout.length; i++) {
      s += nextLayout[i];
    }
    return s;
  }

  function expand(weight: number, j: number) {
    const { maxSize, minSize, collapsedSize } = constraints[j];
    if (collapsedSize >= 0 && weight < minSize) {
      const snapThreshold = collapsedSize + (minSize - collapsedSize) * 0.5;
      if (snapThreshold < weight + remaining) {
        nextLayout[j] = minSize;
        remaining -= minSize - weight;
        weight = minSize;
      } else {
        return;
      }
    }
    if (remaining > 0 && weight < maxSize) {
      const available = maxSize - weight;
      if (available < remaining) {
        nextLayout[j] = maxSize;
        remaining -= available;
      } else {
        nextLayout[j] = weight + remaining;
        remaining = 0;
      }
    }
  }

  function shrink(weight: number, j: number) {
    const { minSize, collapsedSize } = constraints[j];
    if (weight > minSize) {
      const available = weight - minSize;
      if (available < remaining) {
        nextLayout[j] = minSize;
        remaining -= available;
      } else {
        nextLayout[j] = weight - remaining;
        remaining = 0;
      }
    }
    if (minSize > 0 && collapsedSize >= 0 && nextLayout[j] <= minSize) {
      const required = minSize * 0.5;
      if (required < remaining) {
        remaining -= nextLayout[j] - collapsedSize;
        nextLayout[j] = collapsedSize;
      }
    }
  }

  class DraggableResizer extends Draggable {
    #index = 0;

    constructor(ctx: DndContext, index: number) {
      super(ctx);
      this.#index = index;
    }

    protected onStart(_: PointerEvent, el: HTMLElement): void {
      resizerEl = el;
      posDiff = 0;
      nextLayout = $state.snapshot(tile.weights);
      totalWeight = getNextLayoutTotalWidth();
      remaining = 0;
      len = tile.weights.length;

      containerSize =
        (isRow ? splitEl.clientWidth : splitEl.clientHeight) -
        (len - 1) * tile.gapPx;
      constraints = tile.constraints.map((constraints) =>
        normalize({
          constraints,
          targetUnit: 'weight',
          totalSizePercent: 100,
          totalSizePx: containerSize,
          totalWeight: totalWeight,
        })
      );
    }

    protected onMove(e: PointerEvent) {
      const currentPos = isRow ? e.pageX : e.pageY;
      const rect = resizerEl.getBoundingClientRect();
      const lastPos = isRow
        ? rect.x + rect.width / 2
        : rect.y + rect.height / 2;
      posDiff = currentPos - lastPos;
      if (almostEqual(posDiff, 0)) {
        return;
      }

      const deltaWeight = Math.abs((posDiff * totalWeight) / containerSize);
      if (deltaWeight > 0) {
        remaining = deltaWeight;
        this.adjustBy(shrink);
        remaining = deltaWeight - remaining;
        if (remaining > 0) {
          posDiff *= -1;
          this.adjustBy(expand);
        }
        if (remaining < 0) {
          posDiff *= -1;
          remaining = Math.abs(totalWeight - getNextLayoutTotalWidth());
          this.adjustBy(shrink, nextLayout);
        }
        if (almostEqual(totalWeight, getNextLayoutTotalWidth())) {
          for (let j = 0; j < len; j++) {
            tile.weights[j] = nextLayout[j];
          }
        }
      }
    }

    protected onStop() {
      for (let j = 0; j < len; j++) {
        tile.weights[j] = Number.parseFloat(tile.weights[j].toFixed(3));
      }
    }

    private adjustBy(
      adjust: (weight: number, index: number) => void,
      layout = tile.weights
    ) {
      if (posDiff < 0) {
        let j = this.#index - 1;
        while (j >= 0 && remaining > 0) {
          adjust(layout[j], j--);
        }
      } else {
        let j = this.#index;
        while (j < len && remaining > 0) {
          adjust(layout[j], j++);
        }
      }
    }
  }
</script>

<div
  bind:this={splitEl}
  data-split
  style="--gap: {tile.gapPx}px;"
  data-dir={tile.direction}
>
  {#each tile.children as t, i (t.id)}
    {@const draggable = new DraggableResizer(dndCtx, i)}
    <div data-split-item style="--grow: {tile.weights[i]}">
      {#if i > 0}
        <div
          data-split-resizer
          {@attach draggable.register}
          data-dragged={draggable.isDragged}
        >
          {@render resizerSnippet?.(draggable, tile, i)}
        </div>
      {/if}
      {@render child(i)}
    </div>
  {/each}
</div>

<style>
  [data-split] {
    display: flex;
    overflow: hidden;
    gap: var(--gap);

    [data-split-item] {
      position: relative;
      flex: var(--grow) 1 0;
      min-width: 0;
      min-height: 0;
    }

    [data-split-resizer] {
      position: absolute;
    }

    &[data-dir='row'] {
      flex-direction: row;
    }
    &[data-dir='column'] {
      flex-direction: column;
    }
  }
</style>
