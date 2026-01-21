<script lang="ts">
	import Render from './render.svelte';
	import type { Tile } from './model.ts';

	let { tile = $bindable() }: { tile: Tile | undefined } = $props();
</script>

{#if tile}
	<Render
		bind:tile
		unmount={() => (tile = undefined)}
		bind:parent={() => undefined, (t) => (tile = t)}
		index={0}
	/>
{/if}
