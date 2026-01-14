<script lang="ts">
	import { TILER_COMPONENTS } from './internal.js';
	import {
		getTileComponent,
		setTilerContext,
		type TileComponents,
		type TilerContext
	} from './context.js';
	import type { Tile } from './tile.js';

	const { tile, components }: { tile: Tile; components: TileComponents } = $props();

	const ctx: TilerContext = {
		get [TILER_COMPONENTS]() {
			return components;
		}
	};
	setTilerContext(ctx);

	const TileComponent = $derived(getTileComponent(ctx, tile));
</script>

<TileComponent tile={tile as never} />
