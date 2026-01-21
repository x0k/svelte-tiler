<script lang="ts">
	import { createTilerContext, setTilerContext, type TilerContextOptions } from './context.js';
	import type { Tile } from './model.js';
	import Panel from './panel.svelte';

	let { tile = $bindable(), ...rest }: { tile: Tile | undefined } & TilerContextOptions = $props();

	setTilerContext(createTilerContext(rest));
</script>

<Panel bind:tile />
