<script lang="ts" module>
	import type { Snippet } from 'svelte';

	import type { Tile, Tiles } from '../tile.ts';

	import Split from './split.svelte';

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
			weights: options.weights ?? options.children.map(one),
			render: options.render ?? split
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

	export { split };
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	const {
		tile,
		class: className,
		...rest
	}: { tile: Tiles['split'] } & HTMLAttributes<HTMLDivElement> = $props();
</script>

{#snippet split(tile: Tiles['split'])}
	<Split {tile} />
{/snippet}

<div class={['split-container', tile.direction, className]} {...rest}>
	{#each tile.children as t, i (t.id)}
		<div class="item">
			Tile {i}
		</div>
	{/each}
</div>

<style>
	.split-container {
		display: flex;
	}
	.row {
		flex-direction: row;
	}
	.column {
		flex-direction: column;
	}
	.item {
	}
</style>
