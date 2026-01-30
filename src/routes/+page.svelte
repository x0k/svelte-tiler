<script lang="ts">
  import CodiconClose from '~icons/codicon/close';
  import CodiconCloseAll from '~icons/codicon/close-all';
  import MaterialIconThemeSvelte from '~icons/material-icon-theme/svelte';

  import { fromConstant, fromRecord } from '$lib/shared/registry.js';
  import type { Constraint } from '$lib/shared/constraints.js';
  import {
    ClonedGhost,
    DndContext,
    Draggable,
    type StopEvent,
  } from '$lib/shared/dnd.svelte.js';
  import {
    setTilerContext,
    Panel,
    TilerContext,
    type Tiles,
    type Tile,
  } from '$lib/index.js';
  import * as Split from '$lib/tiles/split.svelte';
  import * as Leaf from '$lib/tiles/leaf.svelte';
  import * as Tabs from '$lib/tiles/tabs.svelte';

  import {
    buildTree,
    getFileExtension,
    type FileNode,
    type TreeNode,
  } from './file-tree.ts';
  import Sidebar from './components/sidebar.svelte';
  import FileIcon from './components/file-icon.svelte';
  import ExplorerNode from './components/explorer-node.svelte';
  import type { Component } from 'svelte';

  const files = Object.assign(
    import.meta.glob(['./docs/*', './*.md'], {
      base: '../../',
      import: 'default',
      query: '?marked',
    }),
    import.meta.glob(['./lib/**/*', './examples/*.svelte'], {
      base: '../',
      import: 'default',
      query: '?shiki',
    }),
    import.meta.glob('./package.json', {
      base: '../../',
      import: 'default',
      query: '?shiki',
    })
  );

  const examples = import.meta.glob('./examples/*', {
    base: '../',
    import: 'default',
  }) as Record<string, () => Promise<Component>>;

  let activeTabs: Tiles['tabs'];
  let portalEl: HTMLDivElement;
  const dnd = new DndContext({
    feedback: (e, el) => new ClonedGhost(el, e).attach(portalEl),
  });

  class CustomTilerContext extends TilerContext {
    removeChildFrom(tile: Tile, index: number): void {
      if (tile.id === layout.id) {
        const child = tile.children[index];
        this.definitions[child.type].onClear(this, child as never);
        return;
      }
      super.removeChildFrom(tile, index);
    }
  }

  const ctx = new CustomTilerContext({
    dnd,
    definitions: { split: Split, leaf: Leaf, tabs: Tabs },
    effects: {
      tabs: (tile) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        tile.selectedTab;
        activeTabs = tile;
      },
    },
  });
  setTilerContext(ctx);

  const defaultConstraints: Constraint[] = [
    { type: 'minSize', unit: 'px', value: 80 },
    { type: 'minSize', unit: 'weight', value: 0.2 },
  ];
  const createLeaf = Leaf.setup(fromConstant(leaf));
  function createFileLeaf(path: string) {
    const leaf =
      path.startsWith('./examples/') && getFileExtension(path) === 'svelte'
        ? Split.create({
            gapPx: 1,
            children: [
              {
                tile: createLeaf(path),
              },
              {
                tile: createLeaf(`example:${path}`),
              },
            ],
          })
        : createLeaf(path);
    leaf.id = path;
    return leaf;
  }
  const createTabs = Tabs.setup({
    headers: fromRecord({
      tabHeader,
    }),
    actions: fromRecord({
      actions,
    }),
    empty: fromRecord({
      empty,
    }),
    applySplit({ parent, type, pivot, adjacent, offset }) {
      if (
        parent?.type === 'split' &&
        parent.direction === type &&
        parent.id !== layout.id
      ) {
        const index =
          parent.children.findIndex((c) => c.id === pivot.id) + offset;
        ctx.insertIntoTile(parent.id, 'split', index, {
          children: [adjacent],
          constraints: [defaultConstraints],
        });
        return;
      }
      const tiles = new Array<Split.SplitTileOptions>(2);
      tiles[1 - offset] = { tile: pivot, constraints: defaultConstraints };
      tiles[offset] = { tile: adjacent, constraints: defaultConstraints };
      ctx.replace(
        parent && parent.children.length > 1 ? pivot : parent,
        Split.create({
          direction: type,
          children: tiles,
          gapPx: 1,
        })
      );
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
        },
        {
          tile: createTabs({
            headersDirection: 'row',
            tabHeader: 'tabHeader',
            actions: 'actions',
            empty: 'empty',
            tabs: [['README.md', createFileLeaf('./README.md')]],
          }),
          constraints: defaultConstraints,
        },
      ],
    })
  );

  class DraggableTreeNode extends Draggable<Tile> {
    #lastData: Tile | undefined;

    get data() {
      return (this.#lastData ??= this.options.data);
    }

    protected onStop(e: StopEvent): void {
      if (e.reason === 'drop') {
        this.#lastData = undefined;
      }
    }
  }

  function tabsFromTreeNode(node: TreeNode): Array<[string, Tile]> {
    if (node.type === 'file') {
      return [[node.name, createFileLeaf(node.path)]];
    }
    return node.children.flatMap(tabsFromTreeNode);
  }

  function createDraggable(node: TreeNode) {
    return new DraggableTreeNode(ctx.dnd, {
      get data() {
        return createTabs({
          headersDirection: 'row',
          tabHeader: 'tabHeader',
          actions: 'actions',
          empty: 'empty',
          tabs: tabsFromTreeNode(node),
        });
      },
    });
  }

  function onFileClick(node: FileNode) {
    const index = activeTabs.children.findIndex((c) => c.id === node.path);
    if (index < 0) {
      const s = activeTabs.selectedTab;
      if (activeTabs.children[s]) {
        activeTabs.titles[s] = node.name;
        activeTabs.children[s] = createFileLeaf(node.path);
      } else {
        ctx.insertInto<'tabs'>(activeTabs, activeTabs.children.length, {
          titles: [node.name],
          children: [createFileLeaf(node.path)],
        });
      }
    } else {
      activeTabs.selectedTab = index;
    }
  }

  const tree = buildTree(files);
</script>

<div bind:this={portalEl} class="app">
  <Panel bind:layout />
</div>

{#snippet tabHeader(tile: Tiles['tabs'], i: number)}
  <FileIcon extension={getFileExtension(tile.titles[i])} />
  {tile.titles[i]}
  <button
    class="button"
    onclick={(e) => {
      e.stopPropagation();
      ctx.removeChildFrom(tile, i);
    }}
  >
    <CodiconClose />
  </button>
{/snippet}

{#snippet actions(tile: Tiles['tabs'])}
  <button
    class="button"
    onclick={() => {
      ctx.remove(tile);
    }}
  >
    <CodiconCloseAll />
  </button>
{/snippet}

{#snippet empty()}
  <MaterialIconThemeSvelte />
{/snippet}

{#snippet leaf(tile: Tiles['leaf'])}
  {#if tile.name === 'sidebar'}
    <Sidebar>
      {#each tree as node (node.id)}
        <ExplorerNode {node} {createDraggable} {onFileClick} />
      {/each}
    </Sidebar>
  {:else if tile.name.startsWith('example:')}
    <div class="example">
      {#await examples[tile.name.slice(8)]() then Example}
        <Example />
      {/await}
    </div>
  {:else}
    <div
      class={getFileExtension(tile.name) === 'md' ? 'content' : 'code-preview'}
    >
      {#await files[tile.name]() then content}
        {@html content}
      {/await}
    </div>
  {/if}
{/snippet}

<style>
  .app {
    width: 100%;
    height: 100vh;
  }

  .example {
    padding: 2rem;
    overflow: hidden;
  }
</style>
