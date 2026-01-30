<script lang="ts">
  import type { Tile } from './model.js';
  import Self from './debug.svelte';

  const { tile, level = 0 }: { tile: Tile; level?: number } = $props();
</script>

<div style="padding-left: {level * 12}px;">{tile.type} ({tile.id})</div>
{#each tile.children as c (c.id)}
  <Self tile={c} level={level + 1} />
{/each}
