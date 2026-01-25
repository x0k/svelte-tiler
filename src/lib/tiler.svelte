<script lang="ts">
  import {
    setTilerContext,
    TilerContext,
    type TilerContextOptions,
  } from './context.svelte.ts';
  import type { Tile } from './model.js';
  import Panel from './panel.svelte';

  let {
    layout = $bindable(),
    ...rest
  }: { layout: Tile | undefined } & TilerContextOptions = $props();

  setTilerContext(new TilerContext(rest));
</script>

<Panel bind:layout />
