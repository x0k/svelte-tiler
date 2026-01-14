<script lang="ts">
	import { createRow } from '$lib/tiles/split.svelte';
	import { setupLeafs } from '$lib/tiles/leaf.svelte';
	import Tiler from '$lib/tiler.svelte';

	const leaf = setupLeafs({
		foo
	});
	const tile = createRow(leaf('foo'), leaf('foo'));
</script>

<div>
	<Tiler {tile} />
</div>

{#snippet foo()}
	<p>Foo</p>
{/snippet}
