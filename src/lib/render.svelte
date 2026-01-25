<script lang="ts">
  import { getTilerContext } from './context.svelte.ts';
  import type { Tile } from './model.ts';
  import Self from './render.svelte';

  let {
    tile = $bindable(),
    destroy,
    parent = $bindable(),
    index,
  }: {
    tile: Tile;
    parent: Tile | undefined;
    index: number;
    destroy: () => void;
  } = $props();

  const ctx = getTilerContext();

  $effect(() => {
    if (parent) {
      ctx.registerParent(tile, parent)
    }
  })

  const TileComponent = $derived(ctx.getTileComponent(tile));
</script>

{#snippet child(index: number)}
  <Self
    bind:parent={tile}
    bind:tile={tile.children[index]}
    destroy={() => {
      ctx.removeChild(tile, index);
    }}
    {index}
  />
{/snippet}

<TileComponent
  bind:parent
  bind:tile={tile as never}
  {destroy}
  {index}
  {child}
/>
