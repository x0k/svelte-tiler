<script lang="ts">
	import { marked } from 'marked';

	import readmeMd from '../../README.md?raw';

	import { fromRecord } from '$lib/shared/registry.js';
	import { Tiler, type Tiles } from '$lib/index.js';
	import * as Split from '$lib/tiles/split.svelte';
	import * as Leaf from '$lib/tiles/leaf.svelte';
	import * as Tabs from '$lib/tiles/tabs.svelte';

	import Sidebar from './components/sidebar.svelte';

	const createLeaf = Leaf.setup(
		fromRecord({
			sidebar,
			content
		})
	);
	const createTabs = Tabs.setup({
		createSplit({ parent, type, pivot, adjacent, offset }) {
			if (parent?.type === 'split' && parent.direction === type) {
				const index = parent.children.findIndex((c) => c.id === pivot.id);
				parent.children.splice(index + offset, 0, adjacent);
				parent.constraints.splice(index + offset, 0, { weight: 1, minWeight: 0.2, maxWeight: 0 });
				return parent;
			}
			const tiles = new Array<Tiles['tabs']>(2);
			tiles[1 - offset] = pivot;
			tiles[offset] = adjacent;
			const next = (type === 'row' ? Split.createRow : Split.createColumn).apply(Split, tiles);
			if (parent && parent.children.length > 1) {
				const index = parent.children.findIndex((c) => c.id === pivot.id);
				parent.children[index] = next;
				return parent;
			}
			return next;
		}
	});
	let tile = $state(
		Split.create({
			direction: 'row',
			children: [
				createLeaf('sidebar'),
				createTabs({
					tabs: [['README.md', createLeaf('content')]]
				})
			],
			constraints: [{ minWeight: 0.2, weight: 0.2, maxWeight: 0.4 }, {}]
		})
	);
</script>

<div class="app">
	<Tiler bind:tile tiles={{ split: Split, leaf: Leaf, tabs: Tabs }} />
</div>

{#snippet sidebar()}
	<Sidebar />
{/snippet}

{#snippet content()}
	<div class="content">
		{@html marked.parse(readmeMd)}
	</div>
{/snippet}

<style>
	.app {
		width: 100%;
		height: 100vh;
	}
</style>
