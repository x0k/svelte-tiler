<script lang="ts">
  import { getTilerContext } from './context.js';
  import type { Tile } from './model.js';
  import Self from './render.svelte';

  let {
    tile = $bindable(),
    parent = $bindable(),
    index,
  }: {
    tile: Tile;
    parent: Tile | undefined;
    index: number;
  } = $props();

  const ctx = getTilerContext();

  $effect(() => ctx.registerTile(tile, parent ?? ((t) => (parent = t))));

  $effect(() => ctx.getTileEffect(tile)?.(tile as never));

  const TileComponent = $derived(ctx.getTileComponent(tile));
</script>

{#snippet child(index: number)}
  <Self parent={tile} bind:tile={tile.children[index]} {index} />
{/snippet}

<TileComponent {parent} bind:tile={tile as never} {index} {child} />
