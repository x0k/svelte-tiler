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
      baz
    })
  );

  let layout = $state(
    Split.create({
      gapPx: 16,
      children: [
        {
          tile: createLeaf('foo'),
          constraints: [{ type: 'minSize', unit: 'px', value: 100 }],
        },
        {
          tile: createLeaf('bar'),
        },
        {
          tile: createLeaf('baz'),
          constraints: [{ type: 'minSize', unit: '%', value: 20 }],
        },
      ],
    })
  );
</script>

<Tiler bind:layout tiles={{ leaf: Leaf, split: Split, tabs: Tabs }} />

{#snippet foo()}
  Foo
{/snippet}

{#snippet bar()}
  Bar
{/snippet}

{#snippet baz()}
  Baz
{/snippet}

<style>
  :global .example {
    [data-split-item] {
      display: flex;
      justify-content: center;
      padding: 0.5rem 0;
      border-radius: 5px;
      background-color: lightblue;
    }
    [data-split-resizer] {
      inset: 0;
      border-radius: 5px;
      background-color: lightcyan;
    }
    [data-dir='row'] > [data-split-item] > [data-split-resizer] {
      cursor: col-resize;
      width: calc(var(--gap) - 8px);
      transform: translateX(calc(-50% - var(--gap) / 2));
    }
  }
</style>
