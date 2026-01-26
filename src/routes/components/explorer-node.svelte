<script lang="ts">
  import ChevronRight from '~icons/codicon/chevron-right';
  import ChevronDown from '~icons/codicon/chevron-down';

  import { Draggable } from '$lib/shared/dnd.svelte.js';

  import { getFileExtension, type FileNode, type TreeNode } from '../lib/file-tree.js';
  import ExplorerNode from './explorer-node.svelte';
  import FileIcon from './file-icon.svelte';
  import FolderIcon from './folder-icon.svelte';

  const {
    node,
    level = 1,
    createDraggable,
    onFileClick,
  }: {
    node: TreeNode;
    level?: number;
    createDraggable: (node: TreeNode) => Draggable;
    onFileClick: (node: FileNode) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
    let open = $state(node.name === 'docs');

  const draggable = $derived(createDraggable(node));

  const padding = $derived(level * 10)
</script>

{#if node.type === 'folder'}
  <div
    {@attach draggable.register}
    class="item folder indent"
    style="padding-left: {padding}px"
    onclick={() => (open = !open)}
    role="treeitem"
    aria-expanded={open}
    aria-selected="false"
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      }
    }}
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
      <ExplorerNode {createDraggable} {onFileClick} node={child} level={level + 1} />
    {/each}
  {/if}
{:else}
  <div
    {@attach draggable.register}
    class="item file indent"
    role="treeitem"
    aria-selected="false"
    tabindex="0"
    style="padding-left: {padding}px"
    onclick={() => onFileClick(node)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      }
    }}
  >
    <span class="chevron-placeholder"></span>
    <FileIcon extension={getFileExtension(node.name)} />
    <span class="label">{node.name}</span>
  </div>
{/if}
