<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import CodiconTrash from '~icons/codicon/trash';
  import CodiconNewFile from '~icons/codicon/new-file';
  import CodiconFile from '~icons/codicon/file';

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
        gapPx: 1,
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

<div class="editor" bind:this={portalEl}>
  <Panel bind:layout />
</div>

{#snippet editorHeader(tile: Tiles['tabs'], i: number)}
  <CodiconFile />
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
    class="button"
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
      console.log(tile);
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
      padding: 2px;
      border-radius: 4px;
      gap: 0.5rem;
      background-color: var(--color-text-dim);
      &:hover {
        background: var(--color-text-muted);
      }
    }

    [data-tabs] {
      --tabs-bar-gap: 1px;
      --indicator-size: 2px;
      --indicator-offset: calc(
        -1 * (var(--tabs-bar-gap) + var(--indicator-size)) / 2
      );
      --tabs-bar-height: 28px;

      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    [data-tabs-bar] {
      display: flex;
      overflow: hidden;
      height: var(--tabs-bar-height);
      align-items: center;
    }
    [data-tabs-list] {
      display: flex;
      min-width: 0;
      overflow-x: auto;
      gap: var(--tabs-bar-gap);
      scrollbar-width: thin;
    }
    [data-tabs-spacer] {
      flex-grow: 1;
    }
    [data-tabs-actions] {
      display: flex;
      align-items: center;
      padding: 0 0.5rem;
    }
    [data-tabs-header] {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    [data-tabs-empty] {
      flex: 1 1 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
