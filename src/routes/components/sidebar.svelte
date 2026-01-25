<script lang="ts">
  import GitHub from '~icons/codicon/github-inverted';

  import type { Draggable } from '$lib/shared/dnd.svelte.js';

  import { buildTree, type TreeNode } from '../lib/file-tree.js';
  import ExplorerNode from './explorer-node.svelte';

  const {
    files,
    createDraggable,
  }: {
    files: Record<string, string>;

    createDraggable: (node: TreeNode) => Draggable;
  } = $props();

  const tree = $derived(buildTree(files));
</script>

<div class="sidebar">
  <div class="sidebar-header">
    <span class="title">svelte-tiler</span>

    <div class="actions">
      <a
        class="icon-link"
        href="https://github.com/x0k/svelte-tiler"
        target="_blank"
      >
        <GitHub />
      </a>
    </div>
  </div>

  <div class="explorer" role="tree" tabindex="0">
    {#each tree as node}
      <ExplorerNode {node} {createDraggable} />
    {/each}
  </div>
</div>
