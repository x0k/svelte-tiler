<script lang="ts">
	import { getTileComponent, getTilerContext } from './context.js';
	import type { Tile } from './tile.js';

	let { layout = $bindable() }: { layout: Tile } = $props();

	const ctx = getTilerContext();

	const TileComponent = $derived(getTileComponent(ctx, layout));
</script>

<TileComponent bind:tile={layout as never} />
