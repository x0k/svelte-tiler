<script lang="ts">
  import { fromRecord } from '$lib/shared/registry.js';
  import { Tiler } from '$lib/index.js';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  const createLeaf = Leaf.setup(
    fromRecord({
      foo,
      bar,
    })
  );

  let layout = $state(
    Split.create({
      gapPx: 2,
      children: [
        {
          tile: createLeaf('foo'),
          constraints: [{ type: 'minSize', unit: 'px', value: 200 }],
        },
        {
          tile: createLeaf('bar'),
          constraints: [{ type: 'minSize', unit: '%', value: 20 }],
        },
      ],
    })
  );
</script>

{#snippet foo()}
  <p>Foo</p>
{/snippet}

{#snippet bar()}
  <p>Bar</p>
{/snippet}

<Tiler bind:layout tiles={{ leaf: Leaf, split: Split, tabs: Tabs }} />

<style>
  :global {
    [data-split] {
      border: 2px black solid;
    }
    [data-split-resizer] {
      inset: 0;
      background-color: black;
    }
    [data-dir='row'] > [data-split-item] > [data-split-resizer] {
      cursor: col-resize;
      width: var(--gap);
      transform: translateX(calc(-50% - var(--gap) / 2));
    }
  }
</style>
