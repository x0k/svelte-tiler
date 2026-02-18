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

## Mental Model

This section explains the conceptual model behind the library and how its core pieces fit together.

### Tile

A **Tile** is the fundamental unit of the system. Everything in the layout is represented as a tree of tiles.

Base type definition:

```ts
export interface TileBase<T extends TileType> {
  id: string;
  type: T;
  children: Tile[];
}

export interface TileRegistry {}

export type TileType = keyof TileRegistry;

export type Tiles = {
  [T in TileType]: TileBase<T> & TileRegistry[T];
};

export type Tile = Tiles[TileType];
```

This definition:

- Establishes a minimal structural contract (`id`, `type`, `children`)
- Enables type-safe model extension via `TileRegistry` interface augmentation
- Produces a discriminated union (`Tile`) based on registered tile types

By augmenting `TileRegistry`, you extend the model in a fully type-safe way without modifying the core types.

### TileDefinition

In addition to its type definition, every tile must provide a behavioral definition.

Each tile exposes lifecycle hooks that are invoked by the tiler in order to perform structural mutations:

- `onInsert` - invoked to perform insertion of a child tile at the specified index.
- `onRemoveChild` - invoked to remove a child tile at the specified index.
- `onClear` - invoked when the tile itself cannot be removed (e.g. the root tile) and must reset or clear its internal state instead.

Together with the Svelte component (`export default`), these hooks form a `TileDefinition`:

```ts
export type TileProps<T extends TileType> = {
  tile: Tiles[T];
  parent: Tile | undefined;
  index: number;
  child: Snippet<[number]>;
};

export type TileComponent<T extends TileType> = Component<
  TileProps<T>,
  {},
  'tile'
>;

export interface TileDefinition<T extends TileType> {
  default: TileComponent<T>;
  onInsert: (
    ctx: TilerContext,
    tile: Tiles[T],
    index: number,
    data: TileInsertData<T>
  ) => void;
  onRemoveChild: (ctx: TilerContext, tile: Tiles[T], index: number) => void;
  onClear: (ctx: TilerContext, tile: Tiles[T]) => void;
}
```

The tiler requests a structural change, but the tile fully controls how the mutation is performed.

For example, a Tabs tile may decide that when its last child is removed, it should remove itself instead by calling `ctx.remove(tile)`. This mirrors the behavior of tab panels in editors such as VS Code.

This design keeps structural semantics inside the tile while the context provides the mutation primitives.

## Layout

A **Layout** is a state tree that describes the UI structure.

Tiles form a hierarchical tree representing the entire arrangement.
Mutations to this tree update the rendered structure reactively.

Standard tiles are designed so that layouts remain fully serializable.
To support the serializable pattern, tiles typically export:

- `setup` - installs runtime data into context and returns a parameterized `create` function.
- `create` - produces tile data used in the layout.

Example:

```ts
export function setup<R extends string>(ctx: SplitContext<R>) {
  setContext(SPLIT_CONTEXT_KEY, ctx);
  return create<R>;
}
```

### Context

The Tiler component internally works with a `TilerContext`, but you can also create and manage it manually.

> [!NOTE]
> You can use a single `TilerContext` instance for multiple `Panel` components.

Example:

```svelte
<script lang="ts">
  import { Panel, TilerContext, setTilerContext } from 'svelte-tiler';

  const ctx = new TilerContext({
    definitions: {
      /* your tiles */
    },
  });

  setTilerContext(ctx);
</script>

<Panel bind:layout />
```

Using a custom TilerContext allows you to:

- Programmatically manipulate the layout
- Interact directly with tile operations
- Extend or wrap the context class to inject custom logic
- Centralize control over layout behavior

This makes the system flexible while keeping the layout model predictable and strongly typed.

### Customization

Standard tiles are intentionally shipped unstyled. All visual design decisions - must be implemented by the consumer after reviewing:

- DOM hierarchy
- Available `data-*` attributes
- CSS custom properties

This approach keeps the core layout engine independent of styling concerns and ensures predictable integration into any design system.

If the standard tiles do not meet your requirements, you can freely copy the tile’s source code into your own project,
apply the necessary modifications, and replace the import with your customized version.

## License

MIT
