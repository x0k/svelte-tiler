<script lang="ts" module>
	import type { Snippet } from 'svelte';

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
	const { tile }: { tile: Tiles['split'] } = $props();

	const ctx = getTilerContext();
</script>

<div class="split" data-dir={tile.direction}>
	{#each tile.children as t, i (t.id)}
		{@const Component = getTileComponent(ctx, t)}
		<div class="item" style="--grow: {tile.weights[i]}">
			{#if i > 0}
				<div class="resizer"></div>
			{/if}
			<Component tile={t as never} />
		</div>
	{/each}
</div>

<style>
	.split {
		display: flex;
		overflow: hidden;

		.item {
			position: relative;
			flex: var(--grow) 0 auto;
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

	/* .resizer[data-dir='row'] {
		cursor: col-resize;
		width: var(--size);
		height: 100%;
		left: calc(-1 * var(--size) / 2);
	}

	.resizer[data-dir='column'] {
		cursor: row-resize;
		height: var(--size);
		width: 100%;
		top: calc(-1 * var(--size) / 2);
	}
	.resizer::before {
		content: '';
		position: absolute;
		background: var(--resizer-color, #888);
		opacity: 0.5;
	}
	.resizer[data-dir='row']::before {
		left: 50%;
		top: 0;
		width: 1px;
		height: 100%;
		transform: translateX(-50%);
	}

	.resizer[data-dir='column']::before {
		top: 50%;
		left: 0;
		height: 1px;
		width: 100%;
		transform: translateY(-50%);
	} */
</style>
