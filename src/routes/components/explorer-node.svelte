<script lang="ts">
	import ChevronRight from '~icons/codicon/chevron-right';
	import ChevronDown from '~icons/codicon/chevron-down';
	import FolderClosed from '~icons/codicon/folder';
	import FolderOpened from '~icons/codicon/folder-opened';

	import { getFileExtension, type TreeNode } from '../lib/file-tree.js';
	import ExplorerNode from './explorer-node.svelte';
	import FileIcon from './file-icon.svelte';
	import FolderIcon from './folder-icon.svelte';

	const { node, level = 0 }: { node: TreeNode; level?: number } = $props();

	let open = $state(true);
</script>

{#if node.type === 'folder'}
	<div
		class="item folder indent"
		style="padding-left: {12 + level * 16}px"
		onclick={() => (open = !open)}
		role="treeitem"
		aria-expanded="true"
	>
		<span class="chevron">
			{#if open}
				<ChevronDown />
			{:else}
				<ChevronRight />
			{/if}
		</span>

		<FolderIcon name={node.name} {open} />

		<span class="label">{node.name}</span>
	</div>

	{#if open}
		{#each node.children as child}
			<ExplorerNode node={child} level={level + 1} />
		{/each}
	{/if}
{:else}
	<div class="item file indent" style="padding-left: {12 + level * 16}px">
		<span class="chevron-placeholder"></span>
		<FileIcon extension={getFileExtension(node.name)} />
		<span class="label">{node.name}</span>
	</div>
{/if}
