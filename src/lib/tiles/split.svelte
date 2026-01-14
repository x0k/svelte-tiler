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
			};
		}
	}

	export interface SplitOptions {
		children: Tile[];
		direction?: Direction;
		weights?: number[];
		render?: Snippet<[Tiles['split']]>;
	}

	const one = () => 1;

	export function createSplit(options: SplitOptions): Tiles['split'] {
		return {
			id: crypto.randomUUID(),
			type: 'split',
			children: options.children,
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
					{@attach (n) => {
						let startPos = 0;
						let startLeftWeight = 0;
						let startRightWeight = 0;
						let containerSize = 0;
						let pairSizePx = 0;
						let pairTotalWeight = 0;

						return on(n, 'pointerdown', (e) => {
							n.setPointerCapture(e.pointerId);

							startPos = isRow ? e.clientX : e.clientY;
							startLeftWeight = tile.weights[i - 1];
							startRightWeight = tile.weights[i];
							pairTotalWeight = startLeftWeight + startRightWeight;

							containerSize = isRow ? splitEl.clientWidth : splitEl.clientHeight;
							const allWeight = tile.weights.reduce((s, p) => s + p, 0);
							pairSizePx = (pairTotalWeight / allWeight) * containerSize;

							const onMove = (e: PointerEvent) => {
								const current = isRow ? e.clientX : e.clientY;
								const deltaPx = current - startPos;

								const deltaWeight = (deltaPx / pairSizePx) * pairTotalWeight;

								const nextLeft = startLeftWeight + deltaWeight;
								const nextRight = startRightWeight - deltaWeight;

								if (nextLeft <= 0.01 || nextRight <= 0.01) return;

								tile.weights[i - 1] = nextLeft;
								tile.weights[i] = nextRight;
							};

							const onUp = () => {
								n.releasePointerCapture(e.pointerId);
								window.removeEventListener('pointermove', onMove);
								window.removeEventListener('pointerup', onUp);
							};

							window.addEventListener('pointermove', onMove);
							window.addEventListener('pointerup', onUp);
						});
					}}
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
