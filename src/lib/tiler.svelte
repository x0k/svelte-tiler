<script lang="ts">
	import { createTilerContext, setTilerContext, type TilerContextOptions } from './context.js';
	import type { Tile } from './tile.js';
	import Panel from './panel.svelte';

	let { layout = $bindable(), ...rest }: { layout: Tile } & TilerContextOptions = $props();

	setTilerContext(createTilerContext(rest));
</script>

<Panel bind:layout />
