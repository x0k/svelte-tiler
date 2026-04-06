<script lang="ts">
  import { fromConstant, fromRecord } from '$lib/shared/registry.js';
  import { ClonedGhost, DndContext } from '$lib/shared/dnd.svelte.js';
  import { Tiler, type Tiles } from '$lib/index.js';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as STabs from '$lib/tiles/stabs.svelte';

  import * as tiles from './tiles.ts';

  const createLeaf = Leaf.setup(fromConstant(leaf));
  const createTabs = STabs.setup({
    bars: fromRecord({
      default: bar,
    }),
  });
  let layout = $state(
    createTabs({
      bar: 'default',
      tabs: [
        ['Foo', createLeaf('Foo')],
        ['Bar', createLeaf('Bar')],
        ['Baz', createLeaf('Baz')],
      ],
    })
  );

  let portalEl: HTMLDivElement;
  const dnd = new DndContext({
    plugins: [
      new ClonedGhost({
        get portalTo() {
          return portalEl;
        },
      }),
    ],
  });
</script>

<div class="stabs" bind:this={portalEl}>
  <Tiler
    bind:layout
    definitions={{ ...tiles, leaf: Leaf, stabs: STabs }}
    {dnd}
  />
</div>

{#snippet bar(tile: Tiles['stabs'])}
  <div class="tabs-bar">
    {#each tile.titles as title (tile.id)}
      <div class="tabs-header">
        {title}
      </div>
    {/each}
  </div>
{/snippet}

{#snippet leaf(tile: Tiles['leaf'])}
  {tile.name}
{/snippet}

<style>
  :global .example .stabs {
    --color-bg: #f8f8f2;
    --color-selected: #ccccc7;
    --color-success: #a6e22e;
    --color-text: #1e1f1c;

    color: var(--color-text);
    height: 200px;

    [data-stabs] {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      font-size: larger;
    }
    .tabs-bar {
      overflow-x: auto;
      scrollbar-width: thin;
      display: flex;
      gap: 0.2rem;
      padding: 0.2rem;
      background-color: var(--color-bg);
      border-radius: 10px;
    }
    .tabs-header {
      position: relative;
      width: min-content !important;
      height: min-content !important;
      padding: 0.5rem 2rem;
      border-radius: 10px;
      background-color: var(--color-bg);
      &[aria-selected='true'] {
        background-color: var(--color-selected);
      }
      &[data-over='true'] {
        background-color: var(--color-success);
      }
    }
    [data-tabs-content] {
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-bg);
      border-radius: 15px;
      &[data-over='true'] {
        background-color: var(--color-success);
      }
    }
  }
</style>
