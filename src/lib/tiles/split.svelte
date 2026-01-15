<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import { on } from 'svelte/events';

	import { getTileComponent, getTilerContext } from '$lib/context.js';

	import type { Tile, Tiles } from '../tile.js';

	export type Direction = 'row' | 'column';

	declare module '../tile.js' {
		interface TileRegistry {
			split: {
				weights: number[];
				direction: Direction;
				minWeight: number;
			};
		}
	}

	export interface SplitOptions {
		children: Tile[];
		direction?: Direction;
		weights?: number[];
		minWeight?: number;
		render?: Snippet<[Tiles['split']]>;
	}

	const one = () => 1;

	export function createSplit(options: SplitOptions): Tiles['split'] {
		return {
			id: crypto.randomUUID(),
			type: 'split',
			children: options.children,
			minWeight: options.minWeight ?? 0.1,
			direction: options.direction ?? 'row',
			weights: options.weights ?? options.children.map(one)
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
</script>

<script lang="ts">
	const { tile = $bindable() }: { tile: Tiles['split'] } = $props();

	const ctx = getTilerContext();

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
					{@attach (n) =>
						on(n, 'pointerdown', (e) => {
							n.setPointerCapture(e.pointerId);

							const containerSize = isRow ? splitEl.clientWidth : splitEl.clientHeight;
							const totalWeight = tile.weights.reduce((s, p) => s + p, 0);
							const minW = tile.minWeight;
							const l = tile.weights.length;

							let previousPos = isRow ? e.clientX : e.clientY;

							const onMove = (e: PointerEvent) => {
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
							};

							const onUp = () => {
								n.releasePointerCapture(e.pointerId);
								window.removeEventListener('pointermove', onMove);
								window.removeEventListener('pointerup', onUp);
							};

							window.addEventListener('pointermove', onMove);
							window.addEventListener('pointerup', onUp);
						})}
				></div>
			{/if}
			<Component bind:tile={tile.children![i] as never} />
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
