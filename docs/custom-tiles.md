# Custom tiles

To create a custom tile, a single `.svelte` file is sufficient.

## Registration

In the `<script module>` section, register your tile by augmenting the `TileRegistry` interface.

```ts
declare module 'svelte-tiler' {
  interface TileRegistry {
    myTile: {
      // tile additional props
    };
  }
}
```

- Use only serializable values if you want the entire layout to be serializable.
  For non-serializable values, define a serializable key that can be used to retrieve the value from context.
- It is recommended to use a prefix for custom tiles to avoid conflicts with tiles that may be added in the future.
- If any properties other than `children` are required to implement the insert operation for your tile, specify them in `TileInsertRequirements`. Example:

```ts
declare module 'svelte-tiler' {
  interface TileInsertRequirements {
    tabs: 'titles';
  }
}
```

## Hooks

In the same section, export those functions:

- `onInsert`
- `onRemoveChild`
- `onClear`

## Props

Use the appropriate `TileProps<'myTile'>` typing to receive correctly typed props.

```ts
let { tile = $bindable(), child }: TileProps<'myTile'> = $props();
```

## Shared

If needed, reuse code from the `shared` modules (for example, drag-and-drop helpers).

```ts
import { Draggable } from 'svelte-tiler/shared/dnd.svelte';
```
