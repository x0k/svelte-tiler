<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import type { Registry } from '$lib/shared/registry.js';
	import {
		type PointerEventWithTarget,
		DndContext,
		Draggable,
		Droppable
	} from '$lib/shared/dnd.svelte.js';
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
</script>

<div bind:this={splitEl} class="split" style="--gap: ${tile.gapPx}px;" data-dir={tile.direction}>
	{#each tile.children as t, i (t.id)}
		{@const Component = getTileComponent(ctx, t)}
		{@const draggable = new Draggable(dndCtx, (e: PointerEventWithTarget) => {
			const resizerEl = e.currentTarget;
			const l = tile.constraints.length;
			const isRow = tile.direction === 'row';
			const containerSize =
				(isRow ? splitEl.clientWidth : splitEl.clientHeight) - (l - 1) * tile.gapPx;
			const totalWeight = tile.constraints.reduce((a, b) => a + b.weight, 0);

			let lastDir = 0;
			let startPos = isRow ? e.pageX : e.pageY;
			let lastConstraints = $state.snapshot(tile.constraints);
			let previousPos = startPos;
			let remaining = 0;
			let currentDir = 0;
			const expand = (j: number) => {
				const constraints = lastConstraints[j];
				const isConstrained = constraints.maxWeight !== 0;
				if (constraints.weight < constraints.maxWeight || !isConstrained) {
					const available = constraints.maxWeight - constraints.weight;
					if (available < remaining && isConstrained) {
						tile.constraints[j].weight = constraints.maxWeight;
						remaining -= available;
					} else {
						tile.constraints[j].weight = constraints.weight + remaining;
						remaining = 0;
					}
				}
			};
			const shrink = (j: number) => {
				const constraints = lastConstraints[j];
				if (constraints.weight > constraints.minWeight) {
					const available = constraints.weight - constraints.minWeight;
					if (available < remaining) {
						tile.constraints[j].weight = constraints.minWeight;
						remaining -= available;
					} else {
						tile.constraints[j].weight = constraints.weight - remaining;
						remaining = 0;
					}
				}
			};
			const adjustBy = (adjust: (index: number) => void) => {
				if (currentDir < 0) {
					let j = i - 1;
					while (j >= 0 && remaining > 0) {
						adjust(j--);
					}
				} else {
					let j = i;
					while (j < l && remaining > 0) {
						adjust(j++);
					}
				}
			};

			return {
				onMove(e: PointerEvent) {
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
							lastConstraints = $state.snapshot(tile.constraints);
							lastDir = currentDir;
						}
						const deltaWeight = Math.abs(((currentPos - startPos) * totalWeight) / containerSize);
						if (deltaWeight > 0) {
							remaining = deltaWeight;
							adjustBy(shrink);
							remaining = deltaWeight - remaining;
							if (remaining > 0) {
								currentDir *= -1;
								adjustBy(expand);
							}
						}
					}
					previousPos = currentPos;
				},
				onStop() {
					for (let j = 0; j < tile.constraints.length; j++) {
						const c = tile.constraints[j];
						c.weight = Number.parseFloat(c.weight.toFixed(2));
					}
				}
			};
		})}
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
