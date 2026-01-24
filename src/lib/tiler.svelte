<script lang="ts">
  import {
    createTilerContext,
    setTilerContext,
    type TilerContextOptions,
  } from './context.js';
  import type { Tile } from './model.js';
  import Panel from './panel.svelte';

  let {
    layout = $bindable(),
    ...rest
  }: { layout: Tile | undefined } & TilerContextOptions = $props();

  setTilerContext(createTilerContext(rest));
</script>

<Panel bind:layout />
