<script lang="ts" module>
  const FOCUSABLE_SELECTOR = `
  a[href],
  button:not([disabled]),
  input:not([disabled]),
  textarea:not([disabled]),
  select:not([disabled]),
  [tabindex]:not([tabindex="-1"])
`;

  function isFocusable(el: Element): el is HTMLElement {
    return (
      el instanceof HTMLElement && el.tabIndex >= 0 && el.offsetParent !== null
    );
  }

  export function moveFocus(
    direction: 1 | -1,
    root: ParentNode = document
  ): void {
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(isFocusable);

    if (focusables.length === 0) return;

    const active = document.activeElement;
    const currentIndex =
      active instanceof HTMLElement ? focusables.indexOf(active) : -1;

    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + focusables.length) % focusables.length;

    focusables[nextIndex].focus();
  }
</script>

<script lang="ts">
  import ChevronRight from '~icons/codicon/chevron-right';
  import ChevronDown from '~icons/codicon/chevron-down';

  import { Draggable } from '$lib/shared/dnd.svelte.js';

  import {
    getFileExtension,
    type FileNode,
    type TreeNode,
  } from '../file-tree.ts';
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

  let open = $state(false);

  const draggable = $derived(createDraggable(node));

  const padding = $derived(level * 10);

  function keyDownHandler(
    e: KeyboardEvent & {
      currentTarget: HTMLElement;
    }
  ) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.currentTarget.click();
        break;
      case 'ArrowDown':
        moveFocus(1);
        break;
      case 'ArrowUp':
        moveFocus(-1);
        break;
    }
  }
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
    onkeydown={keyDownHandler}
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
    {#each node.children as child (child.id)}
      <ExplorerNode
        {createDraggable}
        {onFileClick}
        node={child}
        level={level + 1}
      />
    {/each}
  {/if}
{:else}
  <div
    {@attach draggable.register}
    data-dragged={draggable.isDragged}
    class="item file indent"
    role="treeitem"
    aria-selected="false"
    tabindex="0"
    style="padding-left: {padding}px"
    onclick={() => onFileClick(node)}
    onkeydown={keyDownHandler}
  >
    <span class="chevron-placeholder"></span>
    <FileIcon extension={getFileExtension(node.name)} />
    <span class="label">{node.name}</span>
  </div>
{/if}
