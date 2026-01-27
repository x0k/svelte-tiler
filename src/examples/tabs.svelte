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

<div style="height: 200px;" bind:this={portalEl}>
  <Tiler bind:layout tiles={{ leaf: Leaf, split: Split, tabs: Tabs }} {dnd} />
</div>

{#snippet leaf(tile: Tiles['leaf'])}
  {tile.name}
{/snippet}

<style>
  :global .example {
    --color-text-muted: #ccccc7;
    --color-text-dim: #90908a;
    --color-success: #a6e22e;
    [data-tabs] {
      --gap: 0px;
      --indicator-size: 0.4rem;
      --indicator-offset: calc(-1 * (var(--gap) + var(--indicator-size)) / 2);

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
      gap: var(--gap);
      padding: 0.2rem;
      background-color: var(--color-text-dim);
      border-radius: 10px;
    }
    [data-tabs-header] {
      position: relative;
      width: min-content !important;
      height: min-content !important;
      padding: 0.5rem 2rem;
      border-radius: 10px;
      background-color: var(--color-text-dim);
      &[aria-selected='true'] {
        background-color: var(--color-text-muted);
      }
      &[data-over='true'] {
        &::before {
          content: '';
          inset: 0;
          top: 50%;
          transform: translateY(-50%);
          position: absolute;
          height: 70%;
          border-radius: 3px;
          width: var(--indicator-size);
          left: var(--indicator-offset);
          background-color: var(--color-success);
        }
        &[data-hpart='end']::before {
          left: calc(100% + var(--indicator-offset));
        }
      }
    }
    [data-tabs-content] {
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-text-dim);
      border-radius: 15px;
      &[data-over='true'] {
        background-color: var(--color-success);
      }
    }
  }
</style>
