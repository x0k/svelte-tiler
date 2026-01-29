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
  import type { Tile, TileProps, Tiles } from '$lib/model.js';
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
          tile.children.every((c) => c.id !== droppable.tileId))
      ) {
        tick().then(() => {
          ctx.replaceWith(tile, tile.children[1 - i]);
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
    ctx.destroy(tile);
  }

  export function onClear(_ctx: TilerContext, _tile: Tiles['split']) {}

  export function insertTile(
    node: Tiles['split'],
    index: number,
    { tile, constraints = [], weight = 1 }: SplitTileOptions
  ) {
    node.children.splice(index, 0, tile);
    node.constraints.splice(index, 0, constraints);
    node.weights.splice(index, 0, weight);
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
  let currentDir = 0;
  let lastDir = 0;
  let startPos = 0;
  let previousPos = 0;
  let containerSize = 0;
  let remaining = 0;
  let totalWeight = 0;
  let len = 0;
  let constraints: NormalizedConstraints[] = [];

  let lastWeights: number[] = [];
  let nextLayout: number[] = [];

  class DraggableResizer extends Draggable {
    #index = 0;

    constructor(ctx: DndContext, index: number) {
      super(ctx);
      this.#index = index;
    }

    protected onStart(e: PointerEvent, el: HTMLElement): void {
      resizerEl = el;
      currentDir = 0;
      lastDir = 0;
      startPos = isRow ? e.pageX : e.pageY;
      previousPos = startPos;
      this.syncWeights();
      remaining = 0;
      totalWeight = tile.weights.reduce((a, b) => a + b);
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
      currentDir = Math.sign(currentPos - previousPos);
      if (currentDir === 0) {
        return;
      }
      const resizerRect = resizerEl.getBoundingClientRect();
      if (
        isRow
          ? currentDir < 0
            ? currentPos < resizerRect.right
            : currentPos > resizerRect.left
          : currentDir < 0
            ? currentPos < resizerRect.bottom
            : currentPos > resizerRect.top
      ) {
        if (currentDir !== lastDir) {
          startPos = previousPos;
          this.syncWeights();
          lastDir = currentDir;
        }
        const deltaWeight = Math.abs(
          ((currentPos - startPos) * totalWeight) / containerSize
        );
        if (deltaWeight > 0) {
          remaining = deltaWeight;
          this.adjustBy('shrink');
          remaining = deltaWeight - remaining;
          if (remaining > 0) {
            currentDir *= -1;
            this.adjustBy('expand');
          }
          const total = nextLayout.reduce((a, b) => a + b);
          if (almostEqual(totalWeight, total)) {
            for (let j = 0; j < len; j++) {
              tile.weights[j] = nextLayout[j];
            }
          }
        }
      }
      previousPos = currentPos;
    }

    protected onStop() {
      for (let j = 0; j < len; j++) {
        tile.weights[j] = Number.parseFloat(tile.weights[j].toFixed(3));
      }
    }

    private expand(j: number) {
      const weight = lastWeights[j];
      const maxWeight = constraints[j].maxSize;
      if (weight < maxWeight) {
        const available = maxWeight - weight;
        if (available < remaining) {
          nextLayout[j] = maxWeight;
          remaining -= available;
        } else {
          nextLayout[j] = weight + remaining;
          remaining = 0;
        }
      }
    }

    private shrink(j: number) {
      const minWeight = constraints[j].minSize;
      const weight = lastWeights[j];
      if (weight > minWeight) {
        const available = weight - minWeight;
        if (available < remaining) {
          nextLayout[j] = minWeight;
          remaining -= available;
        } else {
          nextLayout[j] = weight - remaining;
          remaining = 0;
        }
      }
    }

    private adjustBy(adjust: 'expand' | 'shrink') {
      if (currentDir < 0) {
        let j = this.#index - 1;
        while (j >= 0 && remaining > 0) {
          this[adjust](j--);
        }
      } else {
        let j = this.#index;
        while (j < len && remaining > 0) {
          this[adjust](j++);
        }
      }
    }

    private syncWeights() {
      lastWeights = $state.snapshot(tile.weights);
      nextLayout = lastWeights.slice();
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
