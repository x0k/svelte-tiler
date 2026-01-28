<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import CodiconTrash from '~icons/codicon/trash';
  import CodiconNewFile from '~icons/codicon/new-file';

  import type { Constraint } from '$lib/shared/constraints.js';
  import { fromConstant, fromRecord } from '$lib/shared/registry.js';
  import { DndContext } from '$lib/shared/dnd.svelte.js';
  import {
    Panel,
    setTilerContext,
    TilerContext,
    type Tiles,
  } from '$lib/index.js';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  const names = new Map<string, string>();
  const content = new SvelteMap<string, string>();

  const defaultTitle = 'New file';
  const defaultConstraints: Constraint[] = [
    { type: 'minSize', unit: 'px', value: 80 },
    { type: 'minSize', unit: 'weight', value: 0.2 },
  ];
  const _createLeaf = Leaf.setup(fromConstant(leaf));
  function createLeaf() {
    const leaf = _createLeaf('file');
    names.set(leaf.id, defaultTitle);
    content.set(leaf.id, 'New file content');
    return leaf;
  }
  const splitGapPx = 8;
  const createTabs = Tabs.setup({
    headers: fromRecord({
      editorHeader,
    }),
    actions: fromRecord({
      editorActions,
    }),
    empty: fromRecord({
      editorIntro,
    }),
    createSplit({ parent, type, pivot, adjacent, offset }) {
      if (
        parent?.type === 'split' &&
        parent.direction === type &&
        parent.id !== layout.id
      ) {
        const index =
          parent.children.findIndex((c) => c.id === pivot.id) + offset;
        Split.insertTile(parent, index, {
          tile: adjacent,
          constraints: defaultConstraints,
        });
        return parent;
      }
      const tiles = new Array<Split.SplitTileOptions>(2);
      tiles[1 - offset] = { tile: pivot, constraints: defaultConstraints };
      tiles[offset] = { tile: adjacent, constraints: defaultConstraints };
      const next = Split.create({
        direction: type,
        children: tiles,
        gapPx: splitGapPx,
      });
      if (parent && parent.children.length > 1) {
        const index = parent.children.findIndex((c) => c.id === pivot.id);
        parent.children[index] = next;
        return parent;
      }
      return next;
    },
  });
  let layout = $state(
    createTabs({
      tabs: [],
      actions: 'editorActions',
      empty: 'editorIntro',
      tabHeader: 'editorHeader',
    })
  );

  let portalEl: HTMLDivElement;
  const dnd = new DndContext({
    get portalTarget() {
      return portalEl;
    },
  });
  const ctx = new TilerContext({
    dnd,
    tiles: { leaf: Leaf, split: Split, tabs: Tabs },
  });
  setTilerContext(ctx);
</script>

<div class="editor" style="--split-gap: {splitGapPx}px;" bind:this={portalEl}>
  <Panel bind:layout />
</div>

{#snippet editorHeader(tile: Tiles['tabs'], i: number)}
  <span
    bind:textContent={
      () => tile.titles[i],
      (v) => {
        tile.titles[i] = v;
        names.set(tile.children[i].id, v);
      }
    }
    contenteditable
  ></span>
  <button
    onclick={(e) => {
      e.stopPropagation();
      const id = tile.children[i].id;
      ctx.removeChild(tile, i);
      names.delete(id);
      content.delete(id);
    }}
  >
    <CodiconTrash />
  </button>
{/snippet}

{#snippet editorActions(tile: Tiles['tabs'])}
  <button
    class="button"
    onclick={() => {
      Tabs.insertTabs(tile, tile.children.length, {
        titles: [defaultTitle],
        children: [createLeaf()],
      });
    }}
  >
    <CodiconNewFile />
  </button>
{/snippet}

{#snippet editorIntro(tile: Tiles['tabs'])}
  <button
    class="button"
    onclick={() => {
      Tabs.insertTabs(tile, 0, {
        titles: [defaultTitle],
        children: [createLeaf()],
      });
    }}
  >
    <CodiconNewFile />
    New file
  </button>
{/snippet}

{#snippet leaf(tile: Tiles['leaf'])}
  <textarea
    bind:value={() => content.get(tile.id), (v) => content.set(tile.id, v!)}
  ></textarea>
{/snippet}

<style>
  :global .example .editor {
    height: 500px;

    button {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .button {
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 10px;
      gap: 0.5rem;
      background-color: var(--color-text-dim);
      &:hover {
        background: var(--color-text-muted);
      }
    }

    [data-tabs] {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: calc(var(--split-gap) /2 );
    }
    [data-tabs-bar] {
      display: flex;
      overflow: hidden;
      align-items: center;
      padding: 0.2rem;
      background-color: var(--color-text-dim);
      border-radius: 10px;
    }
    [data-tabs-list] {
      display: flex;
      gap: 0.2rem;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    [data-tabs-spacer] {
      flex-grow: 1;
    }
    [data-tabs-actions] {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    [data-tabs-header] {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem;
      border: 1px solid var(--color-text-muted);
      background-color: var(--color-text-dim);
      border-radius: 10px;
      > span {
        min-width: 1ch;
      }
      &[aria-selected='true'] {
        background-color: var(--color-text-muted);
      }
    }
    [data-tabs-content] {
      flex: 1 1 0;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      background-color: var(--color-text-dim);
      border-radius: 10px;
      padding: 0.1rem;
      > textarea {
        flex-grow: 1;
        padding: 0.4rem;
        border-radius: 10px;
        background-color: transparent;
        border: none;
        resize: none;
      }
    }
    [data-tabs-empty] {
      flex: 1 1 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    [data-split] {
      --resizer-len: calc(var(--gap) + 0.8rem);
      --resizer-offset: calc(-50% - var(--gap) / 2);

      height: 100%;
      width: 100%;
    }
    [data-split-item] {
      position: relative;
    }
    [data-split-resizer] {
      position: absolute;
      z-index: 10;
      inset: 0;
      border-radius: 5px;
      background-color: var(--color-success);
    }
    [data-dir='row'] > [data-split-item] > [data-split-resizer] {
      cursor: col-resize;
      height: 2rem;
      width: var(--resizer-len);
      top: 50%;
      transform: translate(var(--resizer-offset), -50%);
    }
    [data-dir='column'] > [data-split-item] > [data-split-resizer] {
      cursor: row-resize;
      height: var(--resizer-len);
      width: 2rem;
      left: 50%;
      transform: translate(-50%, var(--resizer-offset));
    }
  }
</style>
