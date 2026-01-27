<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import CodiconTrash from '~icons/codicon/trash';
  import CodiconNewFile from '~icons/codicon/new-file';

  import type { Constraint } from '$lib/shared/constraints.js';
  import { fromConstant, fromRecord } from '$lib/shared/registry.js';
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

  const defaultConstraints: Constraint[] = [
    { type: 'minSize', unit: 'px', value: 80 },
    { type: 'minSize', unit: 'weight', value: 0.2 },
  ];
  const createLeaf = Leaf.setup(fromConstant(leaf));
  const createTabs = Tabs.setup({
    headers: fromRecord({
      editorHeader,
    }),
    actions: fromRecord({
      editorActions
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
    })
  );

  const ctx = new TilerContext({
    tiles: { leaf: Leaf, split: Split, tabs: Tabs },
  });
  setTilerContext(ctx);
</script>

<Panel bind:layout />

{#snippet editorHeader(tile: Tiles['tabs'], i: number)}
  {tile.titles[i]}
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
      console.log(tile)
    }}
  >
    <CodiconNewFile />
  </button>
{/snippet}

{#snippet leaf(tile: Tiles['leaf'])}{/snippet}

<style>
  :global .example {

  }
</style>