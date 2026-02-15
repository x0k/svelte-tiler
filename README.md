# svelte-tiler

A small, unstyled library for building tiling user interfaces.

```sh
npm i svelte-tiler
```

**Features**:

- Serializable state
- Type-safe model extension
- No external dependencies

## Usage

```svelte
<script>
  import { fromConstant } from 'svelte-tiler/shared/registry';
  import { Tiler, type Tiles } from 'svelte-tiler';
  import * as Leaf from 'svelte-tiler/tiles/leaf.svelte';
  import * as Tabs from 'svelte-tiler/tiles/tabs.svelte';

  const createLeaf = Leaf.setup(fromConstant(leaf));

  let layout = $state(
    Tabs.create({
      tabs: [
        ['Foo', createLeaf('foo')],
        ['Bar', createLeaf('bar')],
        ['Baz', createLeaf('baz')],
      ],
    })
  );
</script>

<Tiler bind:layout definitions={{ leaf: Leaf, tabs: Tabs }} />

{#snippet leaf(tile: Tiles['leaf'])}
  {tile.name}
{/snippet}

<style>
  :global {
    [data-tabs] {
      display: flex;
      flex-direction: column;
    }
    [data-tabs-bar] {
      display: flex;
    }
    [data-tabs-list] {}
    [data-tabs-header] {
      &[aria-selected='true'] {}
      &[data-over='true'] {}
    }
    [data-tabs-content] {
      flex-grow: 1;
      &[data-over='true'] {}
    }
  }
</style>
```

## License

MIT
