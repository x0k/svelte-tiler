<script lang="ts">
	import { getTilerContext } from './context.ts';
	import { TILE_DEFINITIONS } from './internal.ts';
	import type { Tile } from './model.ts';
	import Self from './render.svelte';

	let {
		tile = $bindable(),
		unmount,
		parent = $bindable(),
		index
	}: { tile: Tile; parent: Tile | undefined; index: number; unmount: () => void } = $props();

	const ctx = getTilerContext();

	const def = $derived(ctx[TILE_DEFINITIONS][tile.type]);
</script>

{#snippet child(index: number)}
	<Self
		bind:parent={tile}
		bind:tile={tile.children[index]}
		unmount={() => def.unmount(tile as never, index)}
		{index}
	/>
{/snippet}

<def.default bind:parent bind:tile={tile as never} {unmount} {index} {child} />
