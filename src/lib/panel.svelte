<script lang="ts">
  import Render from './render.svelte';
  import type { Tile } from './model.js';

  let { layout = $bindable() }: { layout: Tile | undefined } = $props();
</script>

{#if layout}
  <Render
    bind:tile={layout}
    bind:parent={() => undefined, (t) => (layout = t)}
    index={0}
  />
{/if}
