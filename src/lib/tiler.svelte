<script lang="ts">
	import type { Tile } from './tile.ts';

  const { tile }: { tile: Tile } = $props()
</script>

{@render tile.render(tile)}
