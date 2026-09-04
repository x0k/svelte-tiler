# dnd3

A small, modular drag-and-drop engine for Svelte 5. Headless core, tree-shakable
free functions, everything beyond the essentials is a plugin.

## Quick start

```svelte
<script lang="ts">
  import {
    createDnd,
    createDraggable,
    createDroppable,
    drag,
    drop,
    ghost,
    pointerSensor,
    isDragged,
    isOver,
  } from '$lib/dnd3/index.js';

  interface Item {
    id: string;
    label: string;
  }

  let portalEl: HTMLDivElement;

  const dnd = createDnd<Item>({
    plugins: [pointerSensor(), ghost({ portalTo: () => portalEl })],
  });

  const zone = createDroppable(dnd, {
    onDrop(data, draggable) {
      // move `draggable.id` into this container
    },
  });
</script>

<div bind:this={portalEl}>
  <div class="zone" {@attach drop(zone)}>
    {#each items as item (item.id)}
      {@const itemDraggable = createDraggable(dnd, {
        id: item.id,
        data: () => item,
      })}
      <div
        class="item"
        class:dragged={isDragged(itemDraggable)}
        {@attach drag(itemDraggable)}
      >
        {item.label}
      </div>
    {/each}
  </div>
</div>
```

## Concepts

- **One payload type per context.** `createDnd<Data>()` — use a union or base
  interface when different kinds of items travel through the same context.
- **Records + free functions.** Contexts and entities are inert data; all
  behavior lives in tree-shakable functions taking the record as first argument.
- **Multi-pointer ready.** Every active drag is an operation keyed by
  `pointerId`; accessors like `operations(dnd)` expose all of them, while
  `operation(dnd)` covers the common single-drag case.

## API

### Context

| Function                | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `createDnd(options?)`   | Creates a context. Options: `plugins`, `resolveTarget`.         |
| `dnd[Symbol.dispose]()` | Runs plugin cleanups. Usable with `using dnd = createDnd(...)`. |

### Entities

| Function                        | Description                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `createDraggable(dnd, options)` | Options: `id?`, `data?: () => T \| undefined` (lazy), `disabled?`.                           |
| `createDroppable(dnd, options)` | Options: `id?`, `accepts?`, `detect?`, hooks (`onEnter/onMove/onLeave/onDrop`), `disabled?`. |
| `drag(entity)` / `drop(entity)` | Attachments binding an element to the role.                                                  |
| `dragHandle(entity)`            | Attachment restricting activation to a handle element.                                       |

### Accessors (getter-role free functions)

| Function                                              | Description                                        |
| ----------------------------------------------------- | -------------------------------------------------- |
| `operations(dnd)` / `operation(dnd)`                  | All / first active drag operation.                 |
| `status(dnd)`                                         | `'idle' \| 'dragging'`.                            |
| `source(op)` / `target(op)`                           | Resolved entities for an operation.                |
| `position(op)` / `delta(op)`                          | Geometry.                                          |
| `element(entity)` / `handle(entity)` / `data(entity)` | Entity reads.                                      |
| `isDragged(e)` / `isOver(e)`                          | Reactive predicates for templates.                 |
| `droppables(dnd)` / `draggables(dnd)`                 | Registry views.                                    |
| `isDisabled(e)` / `setDisabled(e, v)`                 | Reactive disabled state (getter/setter functions). |

### Monitor

```ts
subscribe(
  dnd,
  'start' | 'move' | 'over' | 'beforeDrop' | 'drop' | 'cancel' | 'finish',
  handler
);
```

`beforeDrop.preventDefault()` downgrades the stop to a cancel. Event payloads
carry the `DragOperation`; resolve entities with `source(op)` / `target(op)`.

### Collision detection

Per-droppable `detect` option; built-ins: `rectContains` (default),
`closestCenter`. A detector returns a score (lower wins) or `null` (miss).

### Custom targeting

```ts
const dnd = createDnd({
  resolveTarget: (dnd, op) => {
    const candidate = resolveTarget(dnd, op); // built-in strategy
    return isForbidden(candidate) ? undefined : candidate;
  },
});
```

An installed resolver fully owns targeting — returning `undefined` means "no
target". Compose with the exported `resolveTarget` to filter or re-score its
result.

### Plugins

- `pointerSensor({ threshold?, interactive? })` — pointer events, activation
  threshold, handles, Escape/contextmenu cancel, click suppression.
- `ghost({ portalTo?, class?, zIndex? })` — fixed-position clone following the
  pointer.
- `autoscroll({ edgeZone?, maxSpeed? })` — edge-zone scrolling during drags.

## Behavior notes

- Escape and contextmenu cancel **all** concurrent drags.
- Drops are delivered synchronously (`flushSync`); `data` is snapshotted at
  drop time.
- Concurrent drags are supported; each pointer resolves its own target.
