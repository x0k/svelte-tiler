<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import { getTileComponent, getTilerContext } from '$lib/context.js';
	import { onDragStart } from '$lib/dnd.js';
	import { constant } from '$lib/function.js';

	import type { Tile, Tiles } from '../tile.js';

	export type Direction = 'row' | 'column';

	declare module '../tile.js' {
		interface TileRegistry {
			split: {
				weights: number[];
				direction: Direction;
				minWeight: number;
				resizer?: string;
				gapPx: number;
			};
		}
	}

	export interface SplitOptions<R extends string> {
		children: Tile[];
		weights?: number[];
		resizer?: R;
		/** @default "row" */
		direction?: Direction;
		/** @default 10 */
		minWeight?: number;
		/** @default 1 */
		gapPx?: number;
	}

	export function createSplit<R extends string>(options: SplitOptions<R>): Tiles['split'] {
		const minWeight = options.minWeight ?? 10;
		return {
			id: crypto.randomUUID(),
			type: 'split',
			children: options.children,
			minWeight,
			direction: options.direction ?? 'row',
			weights: options.weights ?? options.children.map(constant(minWeight * 10)),
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
		resizer: Record<R, Snippet<[Tiles['split'], number]>>;
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

	const resizer = $derived(
		(tile.resizer !== undefined && splitCtx?.resizer[tile.resizer]) || undefined
	);

	const isRow = $derived(tile.direction === 'row');

	let splitEl: HTMLDivElement;
</script>

<div bind:this={splitEl} class="split" style="--gap: ${tile.gapPx}px;" data-dir={tile.direction}>
	{#each tile.children as t, i (t.id)}
		{@const Component = getTileComponent(ctx, t)}
		<div class="item" style="--grow: {tile.weights[i]}">
			{#if i > 0}
				<div
					class="resizer"
					{@attach onDragStart((e) => {
						const l = tile.weights.length;
						const containerSize =
							(isRow ? splitEl.clientWidth : splitEl.clientHeight) - (l - 1) * tile.gapPx;
						const totalWeight = tile.weights.reduce((s, p) => s + p, 0);
						const minWeight = tile.minWeight;

						let lastDir = 0;
						let startPos = isRow ? e.pageX : e.pageY;
						let lastSnap = $state.snapshot(tile.weights);
						let previousPos = startPos;
						let toShrink = 0;
						const shrink = (j: number) => {
							const currentWeight = lastSnap[j];
							if (currentWeight > minWeight) {
								const shrinkableWeight = currentWeight - minWeight;
								if (shrinkableWeight > toShrink) {
									tile.weights[j] = currentWeight - toShrink;
									toShrink = 0;
								} else {
									tile.weights[j] = minWeight;
									toShrink = toShrink - shrinkableWeight;
								}
							}
						};
						return {
							onMove: (e) => {
								const currentPos = isRow ? e.pageX : e.pageY;
								let currentDir = Math.sign(currentPos - previousPos);
								if (currentDir === 0) {
									return;
								}
								if (currentDir !== lastDir) {
									startPos = previousPos;
									lastSnap = $state.snapshot(tile.weights);
									lastDir = currentDir;
								}
								const deltaWeight = Math.abs(
									Math.floor(((currentPos - startPos) / containerSize) * totalWeight)
								);
								if (deltaWeight > 0) {
									toShrink = deltaWeight;
									if (currentDir < 0) {
										let j = i - 1;
										while (j >= 0 && toShrink > 0) {
											shrink(j);
											j--;
										}
										tile.weights[i] = lastSnap[i] + deltaWeight - toShrink;
									} else {
										let j = i;
										while (j < l && toShrink > 0) {
											shrink(j);
											j++;
										}
										tile.weights[i - 1] = lastSnap[i - 1] + deltaWeight - toShrink;
									}
								}
								previousPos = currentPos;
							}
						};
					})}
				>
					{@render resizer?.(tile, i - 1)}
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
			flex: var(--grow) 1 auto;
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
