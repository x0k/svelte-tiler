<script lang="ts">
	import { DndContext } from './shared/dnd.svelte.ts';
	import { TILER_COMPONENTS } from './internal.js';
	import {
		getTileComponent,
		setTilerContext,
		type TilerComponents,
		type TilerContext
	} from './context.js';
	import type { Tile } from './tile.js';

	let { tile = $bindable(), components }: { tile: Tile; components: TilerComponents } = $props();

	const ctx: TilerContext = {
		get [TILER_COMPONENTS]() {
			return components;
		},
		dnd: new DndContext()
	};
	setTilerContext(ctx);

	const TileComponent = $derived(getTileComponent(ctx, tile));
</script>

<TileComponent bind:tile={tile as never} />
