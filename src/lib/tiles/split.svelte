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
			};
		}
	}

	export interface SplitOptions<R extends string> {
		children: Tile[];
		direction?: Direction;
		weights?: number[];
		minWeight?: number;
		resizer?: R;
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
			resizer: options.resizer
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

<div bind:this={splitEl} class="split" data-dir={tile.direction}>
	{#each tile.children as t, i (t.id)}
		{@const Component = getTileComponent(ctx, t)}
		<div class="item" style="--grow: {tile.weights[i]}">
			{#if i > 0}
				<div
					class="resizer"
					{@attach onDragStart((e) => {
						const containerSize = isRow ? splitEl.clientWidth : splitEl.clientHeight;
						const totalWeight = tile.weights.reduce((s, p) => s + p, 0);
						const minW = tile.minWeight;
						const l = tile.weights.length;

						let previousPos = isRow ? e.clientX : e.clientY;
						return {
							onMove: (e) => {
								const currentPos = isRow ? e.clientX : e.clientY;
								let dPx = currentPos - previousPos;
								if (dPx === 0) {
									return;
								}
								const dw = Math.abs((dPx / containerSize) * totalWeight);
								let toShift = dw;
								if (dPx < 0) {
									let j = i - 1;
									while (j >= 0 && toShift > 0) {
										const w = tile.weights[j];
										if (w > minW) {
											const toSub = w > toShift ? toShift : w - minW;
											tile.weights[j] -= toSub;
											toShift -= toSub;
										}
										j--;
									}
									tile.weights[i] += dw - toShift;
								} else {
									let j = i;
									while (j < l && toShift > 0) {
										const w = tile.weights[j];
										if (w > minW) {
											const toSub = w > toShift ? toShift : w - minW;
											tile.weights[j] -= toSub;
											toShift -= toSub;
										}
										j++;
									}
									tile.weights[i - 1] += dw - toShift;
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
