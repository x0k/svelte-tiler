<script lang="ts">
  import CodiconCopy from '~icons/codicon/copy';

  import { fromConstant, fromRecord } from '$lib/shared/registry.js';
  import type { Constraint } from '$lib/shared/constraints.js';
  import { Tiler, type Tiles } from '$lib/index.js';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  import { highlight, markdownToHTML } from './lib/html.ts';
  import { getFileExtension } from './lib/file-tree.ts';
  import Sidebar from './components/sidebar.svelte';
  import FileIcon from './components/file-icon.svelte';

  import readmeMd from '../../README.md?raw';
  import modelTs from '../lib/model.ts?raw';

  const FILES: Record<string, string> = {
    'lib/model.ts': modelTs,
    'README.md': readmeMd,
  };

  const defaultConstraints: Constraint[] = [
    { type: 'minSize', unit: 'weight', value: 0.2 },
  ];
  const createLeaf = Leaf.setup(fromConstant(leaf));
  const createTabs = Tabs.setup({
    headers: fromRecord({
      tabHeader,
    }),
    actions: fromRecord({
      actions,
    }),
    createSplit({ parent, type, pivot, adjacent, offset }) {
      if (parent?.type === 'split' && parent.direction === type) {
        const index =
          parent.children.findIndex((c) => c.id === pivot.id) + offset;
        parent.children.splice(index, 0, adjacent);
        parent.constraints.splice(index, 0, defaultConstraints);
        parent.weights.splice(index, 0, 1);
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
    Split.create({
      direction: 'row',
      gapPx: 0,
      children: [
        {
          tile: createLeaf('sidebar'),
          weight: 0.2,
          constraints: [
            { type: 'minSize', unit: 'px', value: 150 },
            { type: 'maxSize', unit: 'weight', value: 0.4 },
          ],
        },
        {
          tile: Split.create({
            gapPx: 1,
            children: [
              {
                tile: createTabs({
                  tabHeader: 'tabHeader',
                  actions: 'actions',
                  tabs: [['README.md', createLeaf('README.md')]],
                }),
                constraints: defaultConstraints,
              },
              {
                tile: createTabs({
                  tabHeader: 'tabHeader',
                  actions: 'actions',
                  tabs: [['model.ts', createLeaf('lib/model.ts')]],
                }),
                constraints: defaultConstraints,
              },
            ],
          }),
        },
      ],
    })
  );
</script>

<div class="app">
  <Tiler bind:layout tiles={{ split: Split, leaf: Leaf, tabs: Tabs }} />
</div>

{#snippet tabHeader(tile: Tiles['tabs'], i: number)}
  <FileIcon extension={getFileExtension(tile.titles[i])} />
  {tile.titles[i]}
{/snippet}

{#snippet actions()}
  <button>
    <CodiconCopy />
  </button>
{/snippet}

{#snippet leaf(tile: Tiles['leaf'])}
  {#if tile.name === 'sidebar'}
    <Sidebar files={FILES} />
  {:else if getFileExtension(tile.name) === 'md'}
    <div class="content">
      {@html markdownToHTML(FILES[tile.name])}
    </div>
  {:else}
    <div class="code-preview">
      {@html highlight(FILES[tile.name], getFileExtension(tile.name))}
    </div>
  {/if}
{/snippet}

<style>
  .app {
    width: 100%;
    height: 100vh;
  }
</style>
