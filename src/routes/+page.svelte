<script lang="ts">
	import { fromConstant, fromRecord } from '$lib/shared/registry.js';
	import { Tiler, type Tiles } from '$lib/index.js';
	import * as Split from '$lib/tiles/split.svelte';
	import * as Leaf from '$lib/tiles/leaf.svelte';
	import * as Tabs from '$lib/tiles/tabs.svelte';

	import { highlight, markdownToHTML } from './lib/html.ts';
	import Sidebar from './components/sidebar.svelte';

	import readmeMd from '../../README.md?raw';
	import modelTs from '../lib/model.ts?raw';
	import { getFileExtension } from './lib/file-tree.ts';
	import FileIcon from './components/file-icon.svelte';

	const FILES: Record<string, string> = {
		'lib/model.ts': modelTs,
		'README.md': readmeMd
	};

	const createLeaf = Leaf.setup(fromConstant(leaf));
	const createTabs = Tabs.setup({
		headers: fromRecord({
			tabHeader
		}),
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
					tabHeader: 'tabHeader',
					tabs: [
						['README.md', createLeaf('README.md')],
						['model.ts', createLeaf('lib/model.ts')]
					]
				})
			],
			constraints: [{ minWeight: 0.1, weight: 0.2, maxWeight: 0.4 }, {}]
		})
	);
</script>

<div class="app">
	<Tiler bind:tile tiles={{ split: Split, leaf: Leaf, tabs: Tabs }} />
</div>

{#snippet tabHeader(tile: Tiles['tabs'], i: number)}
	<FileIcon extension={getFileExtension(tile.titles[i])} />
	{tile.titles[i]}
{/snippet}

{#snippet leaf(tile: Tiles['leaf'])}
	{#if tile.name === 'sidebar'}
		<Sidebar files={FILES} />
	{:else if getFileExtension(tile.name) === 'md'}
		<div class="content">
			{@html markdownToHTML(FILES[tile.name])}
		</div>
	{:else}
		<div class="code-preview">
			{@html highlight(FILES[tile.name], getFileExtension(tile.name))}
		</div>
	{/if}
{/snippet}

<style>
	.app {
		width: 100%;
		height: 100vh;
	}
</style>
