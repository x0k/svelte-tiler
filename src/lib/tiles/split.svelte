<script lang="ts" module>
  import { getContext, setContext, tick, type Snippet } from 'svelte';

  import type { Registry } from '$lib/shared/registry.js';
  import { DndContext, Draggable } from '$lib/shared/dnd.svelte.js';
  import { normalize, type Constraint } from '$lib/shared/constraints.js';
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
  import Provider from '$lib/provider.svelte';

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

  interface SplitAPI {
    /**
     * Checks if the panel is at its minimum size.
     * @returns true if weight <= minSize
     */
    isMinimized: (index: number) => boolean;
    /**
     * Shrinks the panel to its minimum size.
     * @returns false if:
     * - Already at minimum size and not collapsed
     * - Cannot redistribute freed space to other panels (all at maxSize)
     */
    minimize: (index: number) => boolean;
    /**
     * Checks if the panel is collapsed.
     * @returns true if weight <= collapsedSize
     */
    isCollapsed: (index: number) => boolean;
    /**
     * Collapses the panel to its collapsed size (smaller than minimum).
     * @returns false if:
     * - Already collapsed
     * - Cannot redistribute freed space to other panels (all at maxSize)
     */
    collapse: (index: number) => boolean;
    /**
     * Checks if the panel is maximized.
     * @returns true if at maxSize or cannot grow further without violating other constraints
     */
    isMaximized: (index: number) => boolean;
    /**
     * Expands the panel to take all available space.
     * @returns false if already maximized (no space to take from other panels)
     */
    maximize: (index: number) => boolean;
    /**
     * Restores the panel to its previously saved size.
     * Attempts partial restoration if full restoration is blocked.
     * @returns false if:
     * - No saved size to restore (must minimize/maximize/collapse first to save current size)
     * - Adjusted target size violates minSize/maxSize constraints
     * - Cannot redistribute space even after adjustment (all panels at their limits)
     */
    restore: (index: number) => boolean;
  }

  type SplitItemAPI = {
    readonly splitTileId: string;
    readonly splitChildIndex: number;
  } & {
    [K in keyof SplitAPI]: (index?: number) => boolean;
  };

  const SPLIT_ITEM_API_CONTEXT_KEY = Symbol();

  export function getItemContext(): SplitItemAPI {
    return getContext(SPLIT_ITEM_API_CONTEXT_KEY);
  }

  const API = new Map<string, SplitAPI>();

  function bind<M extends keyof SplitAPI>(method: M) {
    return (splitId: string, ...args: Parameters<SplitAPI[M]>) => {
      const api = API.get(splitId);
      if (!api) {
        throw new Error(`Unable to find split with id: "${splitId}"`);
      }
      return api[method].apply(api, args);
    };
  }

  export const isMinimized = bind('isMinimized');
  export const minimize = bind('minimize');
  export const isMaximized = bind('maximize');
  export const maximize = bind('maximize');
  export const isCollapsed = bind('isCollapsed');
  export const collapse = bind('collapse');
  export const restore = bind('restore');
</script>

<script lang="ts">
  let { tile = $bindable(), child }: TileProps<'split'> = $props();

  const splitCtx = getContext<SplitContext | undefined>(SPLIT_CONTEXT_KEY);
  const dndCtx = new DndContext();

  const resizerSnippet = $derived(
    (tile.resizer !== undefined && splitCtx?.resizer?.get(tile.resizer)) ||
      undefined
  );

  let resizerEl: HTMLElement;

  let splitClientWidth = $state.raw(0);
  let splitClientHeight = $state.raw(0);
  const isRow = $derived(tile.direction === 'row');
  const totalSizePx = $derived(
    (isRow ? splitClientWidth : splitClientHeight) -
      (tile.weights.length - 1) * tile.gapPx
  );
  const totalWeight = $derived(sumOf(tile.weights));
  const constraints = $derived(
    tile.constraints.map((constraints) =>
      normalize({
        constraints,
        targetUnit: 'weight',
        totalSizePercent: 100,
        totalSizePx,
        totalWeight,
      })
    )
  );

  let posDiff = 0;
  let remaining = 0;
  let snapshottedWeight = 0;

  let nextLayout: number[] = [];
  let len = 0;

  function initNextLayout() {
    nextLayout = $state.snapshot(tile.weights);
    len = nextLayout.length;
  }

  function applyNextLayout() {
    for (let j = 0; j < len; j++) {
      tile.weights[j] = nextLayout[j];
    }
  }

  function sumOf(arr: number[]) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) {
      s += arr[i];
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
      initNextLayout();
      snapshottedWeight = totalWeight;
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

      const deltaWeight = Math.abs((posDiff * snapshottedWeight) / totalSizePx);
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
          remaining = Math.abs(snapshottedWeight - sumOf(nextLayout));
          this.adjustBy(shrink, nextLayout);
        }
        if (almostEqual(snapshottedWeight, sumOf(nextLayout))) {
          applyNextLayout();
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

  let indexes = $derived(tile.weights.map((_, i) => i));
  // TODO: Implement the ability to collapse/expand
  function redistributeWeight(pivotIndex: number, delta: number) {
    let remaining = Math.abs(delta);
    const isGrow = delta > 0;
    const isCandidate = (i: number) =>
      isGrow
        ? nextLayout[i] < constraints[i].maxSize
        : nextLayout[i] > constraints[i].minSize;

    let candidates = indexes.filter((i) => i !== pivotIndex && isCandidate(i));

    while (remaining > 0 && candidates.length > 0) {
      const totalWeight = sumOf(candidates.map((i) => nextLayout[i]));
      let consumed = 0;

      for (const candidateIndex of candidates) {
        const share = remaining * (nextLayout[candidateIndex] / totalWeight);

        const capacity = isGrow
          ? constraints[candidateIndex].maxSize - nextLayout[candidateIndex]
          : nextLayout[candidateIndex] - constraints[candidateIndex].minSize;

        const applied = Math.min(share, capacity);

        nextLayout[candidateIndex] += isGrow ? applied : -applied;
        consumed += applied;
      }

      remaining -= consumed;

      candidates = candidates.filter(isCandidate);
    }

    return remaining;
  }

  let lastWeights = $derived(
    new Array<number | undefined>(tile.weights.length)
  );
  function createApi(defaultIndex: number): SplitItemAPI {
    return {
      get splitTileId() {
        return tile.id;
      },
      splitChildIndex: defaultIndex,
      isMinimized(index = defaultIndex) {
        return tile.weights[index] <= constraints[index].minSize;
      },
      minimize(index = defaultIndex) {
        initNextLayout();
        if (api.isMinimized(index) && !api.isCollapsed(index)) {
          return false;
        }
        const rem = redistributeWeight(
          index,
          nextLayout[index] - constraints[index].minSize
        );
        if (rem > 0) {
          return false;
        }
        lastWeights[index] = nextLayout[index];
        nextLayout[index] = constraints[index].minSize;
        applyNextLayout();
        return true;
      },
      isMaximized(index = defaultIndex) {
        if (tile.weights[index] >= constraints[index].maxSize) {
          return true;
        }
        initNextLayout();
        redistributeWeight(
          index,
          nextLayout[index] - constraints[index].maxSize
        );
        const diff = totalWeight - sumOf(nextLayout);
        return almostEqual(diff, 0);
      },
      maximize(index = defaultIndex) {
        if (api.isMaximized(index)) {
          return false;
        }
        lastWeights[index] = nextLayout[index];
        nextLayout[index] += totalWeight - sumOf(nextLayout);
        applyNextLayout();
        return true;
      },
      isCollapsed(index = defaultIndex) {
        return tile.weights[index] <= constraints[index].collapsedSize;
      },
      collapse(index = defaultIndex) {
        initNextLayout();
        if (api.isCollapsed(index)) {
          return false;
        }
        const rem = redistributeWeight(
          index,
          nextLayout[index] - constraints[index].collapsedSize
        );
        if (rem > 0) {
          return false;
        }
        lastWeights[index] = nextLayout[index];
        nextLayout[index] = constraints[index].collapsedSize;
        applyNextLayout();
        return true;
      },
      restore(index = defaultIndex) {
        initNextLayout();
        let lastWeight = lastWeights[index];
        if (lastWeight === undefined) {
          return false;
        }
        let delta = nextLayout[index] - lastWeight;
        if (almostEqual(delta, 0)) {
          return false;
        }
        let rem = redistributeWeight(index, delta);
        if (rem > 0) {
          delta += Math.sign(delta) * -rem;
          lastWeight = nextLayout[index] - delta;
          if (
            delta < 0
              ? lastWeight < constraints[index].minSize
              : lastWeight > constraints[index].maxSize
          ) {
            return false;
          }
          initNextLayout();
          rem = redistributeWeight(index, delta);
          if (rem > 0) {
            return false;
          }
        }
        lastWeights[index] = undefined;
        nextLayout[index] = lastWeight;
        applyNextLayout();
        return true;
      },
    };
  }

  const api: SplitAPI = createApi(-1);
  $effect(() => {
    const id = tile.id;
    API.set(id, api)
    return () => {
      API.delete(id);
    };
  });
</script>

<div
  {@attach (el) => {
    splitClientHeight = el.clientHeight;
    splitClientWidth = el.clientWidth;
  }}
  bind:clientHeight={splitClientHeight}
  bind:clientWidth={splitClientHeight}
  data-split
  style="--gap: {tile.gapPx}px; --st-split-gap: {tile.gapPx}px;"
  data-dir={tile.direction}
>
  {#each tile.children as t, i (t.id)}
    {@const draggable = new DraggableResizer(dndCtx, i)}
    <Provider key={SPLIT_ITEM_API_CONTEXT_KEY} value={createApi(i)}>
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
    </Provider>
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
