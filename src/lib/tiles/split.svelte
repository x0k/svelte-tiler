<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import type { Registry } from '$lib/shared/registry.js';
	import { DndContext, Draggable } from '$lib/shared/dnd.svelte.js';
	import {
		normalize,
		type Constraint,
		type NormalizedConstraints
	} from '$lib/shared/constraints.js';
	import { almostEqual } from '$lib/shared/geometry.js';
	import type { Tile, TileProps, Tiles } from '$lib/model.js';

	export type Direction = 'row' | 'column';

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

	export function create<R extends string>(options: SplitOptions<R>): Tiles['split'] {
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
			gapPx: options.gapPx ?? 0
		};
	}

	const SPLIT_CONTEXT_KEY = Symbol('split-context-key');

	type SplitContext<R extends string = string> = {
		resizer?: Registry<R, Snippet<[Draggable, Tiles['split'], number]> | undefined>;
	};

	export function setup<R extends string>(ctx: SplitContext<R>) {
		setContext(SPLIT_CONTEXT_KEY, ctx);
		return create<R>;
	}

	export function unmount(tile: Tiles['split'], index: number) {
		tile.children.splice(index, 1);
		tile.weights.splice(index, 1);
		tile.constraints.splice(index, 1);
	}
</script>

<script lang="ts">
	let { tile = $bindable(), child }: TileProps<'split'> = $props();

	const splitCtx = getContext<SplitContext | undefined>(SPLIT_CONTEXT_KEY);
	const dndCtx = new DndContext();

	const resizerSnippet = $derived(
		(tile.resizer !== undefined && splitCtx?.resizer?.get(tile.resizer)) || undefined
	);

	let splitEl: HTMLDivElement;

	class DraggableResizer extends Draggable {
		resizerEl: HTMLElement = splitEl;
		isRow = $derived(tile.direction === 'row');

		index = 0;
		currentDir = 0;
		lastDir = 0;
		startPos = 0;
		previousPos = 0;
		containerSize = 0;
		remaining = 0;
		totalWeight = 0;
		len = 0;
		constraints: NormalizedConstraints[] = [];

		lastWeights: number[] = [];
		nextLayout: number[] = [];

		constructor(ctx: DndContext, index: number) {
			super(ctx);
			this.index = index;
		}

		protected onStart(e: PointerEvent, el: HTMLElement): void {
			this.resizerEl = el;

			this.currentDir = 0;
			this.lastDir = 0;
			this.startPos = this.isRow ? e.pageX : e.pageY;
			this.previousPos = this.startPos;
			this.syncWeights();
			this.remaining = 0;
			this.totalWeight = tile.weights.reduce((a, b) => a + b);
			this.len = tile.weights.length;

			this.containerSize =
				(this.isRow ? splitEl.clientWidth : splitEl.clientHeight) - (this.len - 1) * tile.gapPx;
			this.constraints = tile.constraints.map((constraints) =>
				normalize({
					constraints,
					targetUnit: 'weight',
					totalSizePercent: 100,
					totalSizePx: this.containerSize,
					totalWeight: this.totalWeight
				})
			);
			console.log(this.constraints)
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
					this.syncWeights();
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
					const total = this.nextLayout.reduce((a, b) => a + b);
					if (almostEqual(this.totalWeight, total)) {
						for (let j = 0; j < this.len; j++) {
							tile.weights[j] = this.nextLayout[j];
						}
					}
				}
			}
			this.previousPos = currentPos;
		}

		protected onStop() {
			for (let j = 0; j < this.len; j++) {
				tile.weights[j] = Number.parseFloat(tile.weights[j].toFixed(3));
			}
		}

		private expand(j: number) {
			const weight = this.lastWeights[j];
			const maxWeight = this.constraints[j].maxSize;
			if (weight < maxWeight) {
				const available = maxWeight - weight;
				if (available < this.remaining) {
					this.nextLayout[j] = maxWeight;
					this.remaining -= available;
				} else {
					this.nextLayout[j] = weight + this.remaining;
					this.remaining = 0;
				}
			}
		}

		private shrink(j: number) {
			const minWeight = this.constraints[j].minSize;
			const weight = this.lastWeights[j];
			if (weight > minWeight) {
				const available = weight - minWeight;
				if (available < this.remaining) {
					this.nextLayout[j] = minWeight;
					this.remaining -= available;
				} else {
					this.nextLayout[j] = weight - this.remaining;
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

		private syncWeights() {
			this.lastWeights = $state.snapshot(tile.weights);
			this.nextLayout = this.lastWeights.slice();
		}
	}
</script>

<div bind:this={splitEl} data-split style="--gap: {tile.gapPx}px;" data-dir={tile.direction}>
	{#each tile.children as t, i (t.id)}
		{@const draggable = new DraggableResizer(dndCtx, i)}
		<div data-split-item style="--grow: {tile.weights[i]}">
			{#if i > 0}
				<div data-split-resizer {@attach draggable.register} data-dragged={draggable.isDragged}>
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
