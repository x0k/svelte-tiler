<script lang="ts">
  import { fromConstant } from '$lib/shared/registry.js';
  import { ClonedGhost, DndContext } from '$lib/shared/dnd.svelte.js';
  import { Tiler, type Tiles } from '$lib/index.js';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  const createLeaf = Leaf.setup(fromConstant(leaf));
  // Override app context
  Tabs.setup({});
  let layout = $state(
    Tabs.create({
      tabs: [
        ['Foo', createLeaf('Foo')],
        ['Bar', createLeaf('Bar')],
        ['Baz', createLeaf('Baz')],
      ],
    })
  );

  let portalEl: HTMLDivElement;
  const dnd = new DndContext({
    feedback: (e, el) => new ClonedGhost(el, e).attach(portalEl)
  });
</script>

<div class="tabs" bind:this={portalEl}>
  <Tiler bind:layout tiles={{ leaf: Leaf, split: Split, tabs: Tabs }} {dnd} />
</div>

{#snippet leaf(tile: Tiles['leaf'])}
  {tile.name}
{/snippet}

<style>
  :global .example .tabs {
    --color-text: #f8f8f2;
    --color-text-muted: #ccccc7;
    --color-success: #a6e22e;

    height: 200px;

    [data-tabs] {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      font-size: larger;
    }
    [data-tabs-bar] {
      display: flex;
    }
    [data-tabs-list] {
      overflow-x: auto;
      scrollbar-width: thin;
      display: flex;
      gap: 0.2rem;
      padding: 0.2rem;
      background-color: var(--color-text);
      border-radius: 10px;
    }
    [data-tabs-header] {
      position: relative;
      width: min-content !important;
      height: min-content !important;
      padding: 0.5rem 2rem;
      border-radius: 10px;
      background-color: var(--color-text);
      &[aria-selected='true'] {
        background-color: var(--color-text-muted);
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
      background-color: var(--color-text);
      border-radius: 15px;
      &[data-over='true'] {
        background-color: var(--color-success);
      }
    }
  }
</style>
