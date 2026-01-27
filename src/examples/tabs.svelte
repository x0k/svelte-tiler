<script lang="ts">
  import { fromConstant } from '$lib/shared/registry.js';
  import { DndContext } from '$lib/shared/dnd.svelte.js';
  import { Tiler, type Tiles } from '$lib/index.js';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  const createLeaf = Leaf.setup(fromConstant(leaf));
  // Override app context
  Tabs.setup({});
  let layout = $state(
    Tabs.create({
      headersDirection: 'column',
      tabs: [
        ['Foo', createLeaf('Foo')],
        ['Bar', createLeaf('Bar')],
        ['Baz', createLeaf('Baz')],
      ],
    })
  );

  let portalEl: HTMLDivElement;
  const dnd = new DndContext({
    get portalTarget() {
      return portalEl;
    },
  });
</script>

<Tiler bind:layout tiles={{ leaf: Leaf, split: Split, tabs: Tabs }} {dnd} />
<div bind:this={portalEl}></div>

{#snippet leaf(tile: Tiles['leaf'])}
  {tile.name}
{/snippet}

<style>
  :global .example {
    [data-tabs] {
      display: flex;
      flex-direction: row-reverse;
      gap: 1rem;
    }
    [data-tabs-list] {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding: 0.6rem 0;
    }
    [data-tabs-header] {
      position: relative;
      width: min-content !important;
      height: min-content !important;
      padding: 0.5rem 1rem;
      background-color: lightgreen;
      border-radius: 5px;
      &[aria-selected='true'] {
        background-color: yellow;
      }
      &[data-over='true'] {
        &::before {
          content: '';
          position: absolute;
          top: -0.4rem;
          left: 0;
          right: 0;
          height: 0.2rem;
          background-color: white;
        }
        &[data-vpart='end']::before {
          top: calc(100% + 0.2rem);
        }
      }
    }
    [data-tabs-content] {
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: lightblue;
      border-radius: 5px;
      &[data-over="true"] {
        background-color: lightskyblue;
      }
    }
  }
</style>
