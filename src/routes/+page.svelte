<script lang="ts">
  import type { Component } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import CodiconClose from '~icons/codicon/close';
  import CodiconCloseAll from '~icons/codicon/close-all';
  import MaterialIconThemeSvelte from '~icons/material-icon-theme/svelte';
  import CodiconLinkExternal from '~icons/codicon/link-external';
  import CodiconCopy from '~icons/codicon/copy';

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
  import { createReplLink } from './repl.ts';
  import { copyTextToClipboard } from './clipboard.ts';

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
  const exampleContents = import.meta.glob(
    ['./examples/*', './lib/tiles/*.svelte'],
    {
      base: '../',
      import: 'default',
      query: '?example',
    }
  ) as Record<string, () => Promise<string>>;

  let portalEl: HTMLDivElement;
  const dnd = new DndContext({
    feedback: (e, el) => new ClonedGhost(el, e).attach(portalEl),
  });

  const ctx = new TilerContext({
    dnd,
    definitions: {
      leaf: Leaf,
      split: {
        ...Split,
        onRemoveChild(ctx, tile, index) {
          const c = tile.children[index];
          if (tile.id === layout.id && c.type === 'tabs') {
            Tabs.onClear(ctx, c);
            return;
          }
          if (c.id === activeTabsId) {
            activeTabsId = tile.children[index > 0 ? index - 1 : 1].id;
          }
          Split.onRemoveChild(ctx, tile, index);
        },
      },
      tabs: {
        ...Tabs,
        onInsert(ctx, tile, index, data) {
          Tabs.onInsert(ctx, tile, index, data);
          activeTabsId = tile.id;
        },
      },
    },
  });
  setTilerContext(ctx);

  const defaultConstraints: Constraint[] = [
    { type: 'minSize', unit: 'px', value: 160 },
  ];
  const createLeaf = Leaf.setup(fromConstant(leaf));
  function isExamplePath(path: string) {
    return (
      path.startsWith('./examples/') && getFileExtension(path) === 'svelte'
    );
  }
  function isTilePath(path: string) {
    return path.startsWith('./lib/tiles/');
  }
  function createFileLeaf(path: string) {
    const leaf = isExamplePath(path)
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
        parent && parent.children.length < 2 ? parent : pivot,
        Split.create({
          direction: type,
          children: tiles,
          gapPx: 1,
        })
      );
      activeTabsId = adjacent.id;
    },
  });
  const firstTabs = createTabs({
    headersDirection: 'row',
    tabHeader: 'tabHeader',
    actions: 'actions',
    empty: 'empty',
    tabs: [['README.md', createFileLeaf('./README.md')]],
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
            { type: 'minSize', unit: 'px', value: 200 },
            { type: 'collapsedSize', unit: 'px', value: 0 },
          ],
        },
        {
          tile: firstTabs,
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

  let activeTabsId = $state.raw<string | undefined>(firstTabs.id);
  const activeTabsTile = $derived.by(() => {
    const tile = activeTabsId && ctx.getTileById(activeTabsId);
    return !tile || tile.type !== 'tabs' ? undefined : tile;
  });

  function onFileClick(node: FileNode) {
    if (!activeTabsTile) {
      return;
    }
    const index = activeTabsTile.children.findIndex((c) => c.id === node.path);
    if (index < 0) {
      ctx.insertInto<'tabs'>(activeTabsTile, activeTabsTile.children.length, {
        titles: [node.name],
        children: [createFileLeaf(node.path)],
      });
    } else {
      activeTabsTile.selectedTab = index;
    }
  }

  const tree = buildTree(files);

  function handleKeydown(e: KeyboardEvent & { currentTarget: HTMLElement }) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  }

  let restore: (() => void) | undefined;
</script>

<div bind:this={portalEl} class="app">
  <Panel bind:layout />
</div>

{#snippet tabHeader(
  props: HTMLAttributes<HTMLElement>,
  tile: Tiles['tabs'],
  i: number
)}
  {@const itemCtx = Split.getItemContext()}
  <div
    {...props}
    onclick={() => {
      tile.selectedTab = i;
      activeTabsId = tile.id;
      if (itemCtx.isMinimized()) {
        itemCtx.maximize();
      }
    }}
    ondblclick={() => {
      if (layout.children[1]?.id === tile.id) {
        return;
      }
      if (itemCtx.isMaximized()) {
        if (!restore?.()) {
          itemCtx.minimize();
        }
        restore = undefined;
      } else {
        itemCtx.maximize();
        restore ??= () => itemCtx.restore();
      }
    }}
  >
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
  </div>
{/snippet}

{#snippet actions(tile: Tiles['tabs'])}
  {@const selected: Tile | undefined = tile.children[tile.selectedTab]}
  {#if selected && isExamplePath(selected.id)}
    <button
      class="button"
      onclick={async () => {
        const id = selected.id;
        const titleStart = id.lastIndexOf('/');
        const link = await createReplLink(
          id.slice(titleStart + 1, -7),
          await exampleContents[id]()
        );
        window.open(link, '_blank');
      }}
    >
      <CodiconLinkExternal />
    </button>
  {:else if selected && isTilePath(selected.id)}
    <button
      class="button"
      onclick={async () => {
        const content = await exampleContents[selected.id]();
        try {
          await copyTextToClipboard(content);
          window.alert('Text copied!');
        } catch (err) {
          console.error(err);
          window.alert('An error occurred while copying!');
        }
      }}
    >
      <CodiconCopy />
    </button>
  {/if}
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

{#snippet leaf(tile: Tiles['leaf'], _: number, p: Tile | undefined)}
  {@const handleClick = () => {
    if (p?.type === 'tabs') {
      activeTabsId = p.id;
    }
  }}
  {#if tile.name === 'sidebar'}
    <Sidebar>
      {#each tree as node (node.id)}
        <ExplorerNode {node} {createDraggable} {onFileClick} />
      {/each}
    </Sidebar>
  {:else if tile.name.startsWith('example:')}
    <div
      class="example"
      role="tabpanel"
      onkeydown={handleKeydown}
      onclick={handleClick}
      tabindex="0"
    >
      {#await examples[tile.name.slice(8)]() then Example}
        <Example />
      {/await}
    </div>
  {:else}
    <div
      class={getFileExtension(tile.name) === 'md' ? 'content' : 'code-preview'}
      role="tabpanel"
      onkeydown={handleKeydown}
      onclick={handleClick}
      tabindex="0"
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
