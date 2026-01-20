<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import type { Registry } from '$lib/shared/registry.js';
	import { type PointerEventWithTarget, DndContext, Draggable } from '$lib/shared/dnd.svelte.js';
	import { getTileComponent, getTilerContext } from '$lib/context.js';

	import type { Tile, Tiles } from '../tile.js';

	export type Direction = 'row' | 'column';

	export interface TileConstraints {
		weight: number;
		minWeight: number;
		maxWeight: number;
	}

	declare module '../tile.js' {
		interface TileRegistry {
			split: {
				constraints: TileConstraints[];
				direction: Direction;
				resizer?: string;
				gapPx: number;
			};
		}
	}

	export interface SplitOptions<R extends string> {
		children: Tile[];
		constraints?: Partial<TileConstraints>[];
		resizer?: R;
		/** @default "row" */
		direction?: Direction;
		/** @default 1 */
		gapPx?: number;
	}

	const empty = (): Partial<TileConstraints> => ({});

	export function createSplit<R extends string>(options: SplitOptions<R>): Tiles['split'] {
		const constraints: TileConstraints[] = (options.constraints ?? options.children.map(empty)).map(
			({ weight = 1, minWeight = weight * 0.2, maxWeight = 0 }) => ({
				weight,
				minWeight,
				maxWeight
			})
		);
		return {
			id: crypto.randomUUID(),
			type: 'split',
			children: options.children,
			constraints,
			direction: options.direction ?? 'row',
			resizer: options.resizer,
			gapPx: options.gapPx ?? 1
		};
	}

	export function createRow(...children: Tile[]) {
		return createSplit({
			direction: 'row',
			children
		});
	}

	export function createColumn(...children: Tile[]) {
		return createSplit({
			direction: 'column',
			children
		});
	}

	const SPLIT_CONTEXT_KEY = Symbol('split-context-key');

	type SplitContext<R extends string = string> = {
		resizer?: Registry<R, Snippet<[Draggable, Tiles['split'], number]> | undefined>;
	};

	export function setupSplit<R extends string>(ctx: SplitContext<R>) {
		setContext(SPLIT_CONTEXT_KEY, ctx);
		return createSplit<R>;
	}
</script>

<script lang="ts">
	const { tile = $bindable() }: { tile: Tiles['split'] } = $props();

	const ctx = getTilerContext();
	const splitCtx = getContext<SplitContext | undefined>(SPLIT_CONTEXT_KEY);
	const dndCtx = new DndContext();

	const resizerSnippet = $derived(
		(tile.resizer !== undefined && splitCtx?.resizer?.get(tile.resizer)) || undefined
	);

	let splitEl: HTMLDivElement;

	class DraggableResizer extends Draggable {
		resizerEl: HTMLElement = splitEl;
		len = $derived(tile.constraints.length);
		isRow = $derived(tile.direction === 'row');
		totalWeight = $derived(tile.constraints.reduce((a, b) => a + b.weight, 0));

		index = 0;
		currentDir = 0;
		lastDir = 0;
		startPos = 0;
		previousPos = 0;
		containerSize = 0;
		lastConstraints: TileConstraints[] = [];
		remaining = 0;

		constructor(ctx: DndContext, index: number) {
			super(ctx);
			this.index = index;
		}

		protected onStart(e: PointerEventWithTarget): void {
			this.resizerEl = e.currentTarget;
			this.containerSize = this.isRow ? splitEl.clientWidth : splitEl.clientHeight;

			this.currentDir = 0;
			this.lastDir = 0;
			this.startPos = this.isRow ? e.pageX : e.pageY;
			this.previousPos = this.startPos;
			this.lastConstraints = $state.snapshot(tile.constraints);
			this.remaining = 0;
		}

		protected onMove(e: PointerEvent) {
			const currentPos = this.isRow ? e.pageX : e.pageY;
			this.currentDir = Math.sign(currentPos - this.previousPos);
			if (this.currentDir === 0) {
				return;
			}
			const resizerRect = this.resizerEl.getBoundingClientRect();
			if (
				this.isRow
					? this.currentDir < 0
						? currentPos < resizerRect.right
						: currentPos > resizerRect.left
					: this.currentDir < 0
						? currentPos < resizerRect.bottom
						: currentPos > resizerRect.top
			) {
				if (this.currentDir !== this.lastDir) {
					this.startPos = this.previousPos;
					this.lastConstraints = $state.snapshot(tile.constraints);
					this.lastDir = this.currentDir;
				}
				const deltaWeight = Math.abs(
					((currentPos - this.startPos) * this.totalWeight) / this.containerSize
				);
				if (deltaWeight > 0) {
					this.remaining = deltaWeight;
					this.adjustBy('shrink');
					this.remaining = deltaWeight - this.remaining;
					if (this.remaining > 0) {
						this.currentDir *= -1;
						this.adjustBy('expand');
					}
				}
			}
			this.previousPos = currentPos;
		}

		protected onStop() {
			for (let j = 0; j < this.len; j++) {
				const c = tile.constraints[j];
				c.weight = Number.parseFloat(c.weight.toFixed(2));
			}
		}

		private expand(j: number) {
			const constraints = this.lastConstraints[j];
			const isConstrained = constraints.maxWeight !== 0;
			if (constraints.weight < constraints.maxWeight || !isConstrained) {
				const available = constraints.maxWeight - constraints.weight;
				if (available < this.remaining && isConstrained) {
					tile.constraints[j].weight = constraints.maxWeight;
					this.remaining -= available;
				} else {
					tile.constraints[j].weight = constraints.weight + this.remaining;
					this.remaining = 0;
				}
			}
		}

		private shrink(j: number) {
			const constraints = this.lastConstraints[j];
			if (constraints.weight > constraints.minWeight) {
				const available = constraints.weight - constraints.minWeight;
				if (available < this.remaining) {
					tile.constraints[j].weight = constraints.minWeight;
					this.remaining -= available;
				} else {
					tile.constraints[j].weight = constraints.weight - this.remaining;
					this.remaining = 0;
				}
			}
		}

		private adjustBy(adjust: 'expand' | 'shrink') {
			if (this.currentDir < 0) {
				let j = this.index - 1;
				while (j >= 0 && this.remaining > 0) {
					this[adjust](j--);
				}
			} else {
				let j = this.index;
				while (j < this.len && this.remaining > 0) {
					this[adjust](j++);
				}
			}
		}
	}
</script>

<div bind:this={splitEl} class="split" style="--gap: ${tile.gapPx}px;" data-dir={tile.direction}>
	{#each tile.children as t, i (t.id)}
		{@const Component = getTileComponent(ctx, t)}
		{@const draggable = new DraggableResizer(dndCtx, i)}
		<div class="item" style="--grow: {tile.constraints[i].weight}">
			{#if i > 0}
				<div class="resizer" {@attach draggable.register} data-dragged={draggable.isDragged}>
					{@render resizerSnippet?.(draggable, tile, i)}
				</div>
			{/if}
			<Component bind:tile={tile.children[i] as never} />
		</div>
	{/each}
</div>

<style>
	.split {
		display: flex;
		overflow: hidden;
		gap: var(--gap);

		.item {
			position: relative;
			flex: var(--grow) 1 0;
		}

		.resizer {
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
