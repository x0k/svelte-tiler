<script lang="ts">
  import { fromConstant } from '$lib/shared/registry.js';
  import { Tiler, type Tiles } from '$lib/index.js';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  const createLeaf = Leaf.setup(fromConstant(leaf));

  let layout = $state(
    Split.create({
      gapPx: 8,
      children: [
        {
          tile: createLeaf('foo'),
          constraints: [{ type: 'minSize', unit: 'px', value: 100 }],
        },
        {
          tile: Split.create({
            gapPx: 8,
            direction: 'column',
            children: [
              {
                tile: createLeaf('bar'),
              },
              {
                tile: createLeaf('baz'),
                constraints: [{ type: 'minSize', unit: '%', value: 20 }],
              },
            ],
          }),
        },
      ],
    })
  );
</script>

<div style="height: 200px;">
  <Tiler bind:layout tiles={{ leaf: Leaf, split: Split, tabs: Tabs }} />
</div>

{#snippet leaf(tile: Tiles['leaf'])}
  <div class="leaf">{tile.name}</div>
{/snippet}

<style>
  :global .example {
    --color-success: #a6e22e;
    --color-text-dim: #90908a;
    [data-split] {
      --resizer-len: calc(var(--gap) + 0.8rem);
      --resizer-offset: calc(-50% - var(--gap) / 2);

      width: 100%;
      height: 100%;
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
    .leaf {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: var(--color-text-dim);
      border-radius: 5px;
      font-size: larger;
    }
  }
</style>
