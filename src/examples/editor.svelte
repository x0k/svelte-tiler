<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import CodiconTrash from '~icons/codicon/trash';
  import CodiconNewFile from '~icons/codicon/new-file';
  import CodiconGripper from '~icons/codicon/gripper';

  import type { Constraint } from '$lib/shared/constraints.js';
  import { fromConstant, fromRecord } from '$lib/shared/registry.js';
  import {
    ClonedGhost,
    DndContext,
    Draggable,
  } from '$lib/shared/dnd.svelte.js';
  import {
    Panel,
    setTilerContext,
    TilerContext,
    type Tile,
    type Tiles,
  } from '$lib/index.js';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  const names = new Map<string, string>();
  const content = new SvelteMap<string, string>();

  const defaultTitle = 'File';
  const defaultConstraints: Constraint[] = [
    { type: 'minSize', unit: 'px', value: 80 },
    { type: 'minSize', unit: 'weight', value: 0.2 },
  ];
  const createLeaf = Leaf.setup(fromConstant(leaf));
  let count = 0;
  function createTitledLeaf() {
    const leaf = createLeaf('file');
    const nextTitle = `${defaultTitle} (${count})`;
    names.set(leaf.id, nextTitle);
    content.set(leaf.id, `File content (${count++})`);
    return {
      titles: [nextTitle],
      children: [leaf],
    };
  }
  const splitGapPx = 10;
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
    feedback: (e, el) => new ClonedGhost(el, e).attach(portalEl),
  });
  const ctx = new TilerContext({
    dnd,
    definitions: { leaf: Leaf, split: Split, tabs: Tabs },
  });
  setTilerContext(ctx);
</script>

<div class="editor" style="--split-gap: {splitGapPx}px;" bind:this={portalEl}>
  <Panel bind:layout />
</div>

{#snippet editorHeader(tile: Tiles['tabs'], i: number, d: Draggable<Tile>)}
  <CodiconGripper {@attach d.registerHandel} />
  <span
    bind:textContent={
      () => tile.titles[i],
      (v) => {
        tile.titles[i] = v;
        names.set(tile.children[i].id, v);
      }
    }
    contenteditable
    spellcheck={false}
  ></span>
  <button
    onclick={(e) => {
      e.stopPropagation();
      const id = tile.children[i].id;
      ctx.removeChildFrom(tile, i);
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
      Tabs.insertTabs(tile, tile.children.length, createTitledLeaf());
    }}
  >
    <CodiconNewFile />
  </button>
{/snippet}

{#snippet editorIntro(tile: Tiles['tabs'])}
  <button
    class="button"
    onclick={() => {
      Tabs.insertTabs(tile, 0, createTitledLeaf());
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
    --color-bg: #f8f8f2;
    --color-selected: #ccccc7;
    --color-border: #272822;
    --color-success: #a6e22e;

    height: 500px;

    button {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      &:focus {
        outline: 1px solid var(--color-border);
      }
    }

    .button {
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 10px;
      gap: 0.5rem;
      background-color: var(--color-bg);
      &:hover {
        background: var(--color-selected);
      }
    }

    [data-tabs] {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 2px;
      background-color: var(--color-bg);
      border-radius: 10px;
    }
    [data-tabs-bar] {
      display: flex;
      overflow: hidden;
      align-items: center;
      padding: 0.4rem;
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
      height: 100%;
      border-radius: 10px;
      &[data-over='true'] {
        background-color: var(--color-success);
      }
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
      width: min-content !important;
      height: min-content !important;
      gap: 0.3rem;
      padding: 0.4rem;
      background-color: var(--color-bg);
      border-radius: 10px;
      > :first-child {
        cursor: move;
      }
      > span {
        min-width: 1ch;
        padding: 0.1rem 0.3rem;
        text-wrap: nowrap;
      }
      &[aria-selected='true'] {
        background-color: var(--color-selected);
      }
      &[data-over='true'] {
        background-color: var(--color-success);
      }
    }
    [data-tabs-content] {
      flex: 1 1 0;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      padding: 0.2rem;
      position: relative;
      > textarea {
        flex-grow: 1;
        padding: 0.4rem;
        border-radius: 10px;
        background-color: transparent;
        resize: none;
        border: 1px solid var(--color-border);
      }
      &::after {
        content: '';
        position: absolute;
        pointer-events: none;
        background: var(--color-success);
        border-radius: 10px;
        transition: inset 160ms ease;
      }
      &[data-over='true'] {
        &::after {
          opacity: 0.4;
        }
        &[data-hpart='center'][data-vpart='center']::after {
          inset: 0;
        }

        &[data-hpart='start']::after {
          inset: 0 50% 0 0;
        }

        &[data-hpart='end']::after {
          inset: 0 0 0 50%;
        }

        &[data-hpart='center'][data-vpart='start']::after {
          inset: 0 0 50% 0;
        }

        &[data-hpart='center'][data-vpart='end']::after {
          inset: 50% 0 0 0;
        }
      }
    }
    [data-tabs-empty] {
      flex: 1 1 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    [data-split] {
      --resizer-len: calc(var(--gap) - 4px);
      --resizer-offset: calc(-50% - var(--gap) / 2);

      height: 100%;
      width: 100%;
    }
    [data-split-item] {
      position: relative;
    }
    [data-split-resizer] {
      position: absolute;
      inset: 0;
    }
    [data-dir='row'] > [data-split-item] > [data-split-resizer] {
      cursor: col-resize;
      width: var(--resizer-len);
      transform: translateX(var(--resizer-offset));
    }
    [data-dir='column'] > [data-split-item] > [data-split-resizer] {
      cursor: row-resize;
      height: var(--resizer-len);
      transform: translateY(var(--resizer-offset));
    }
  }
</style>
