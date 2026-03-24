---
'svelte-tiler': minor
---

[BREAKING] Introduce DND plugins system.

To migrate, replace the following code:

```ts
const dnd = new DndContext({
  feedback: (e, el) => new ClonedGhost(el, e).attach(portalEl),
});
```

with:

```ts
const dnd = new DndContext({
  plugins: [
    new ClonedGhost({
      get portalTo() {
        return portalEl;
      },
    }),
  ],
});
```

Replace: `Draggable` -> `DragSource`, `Droppable` -> `DropTarget`.

`onStart` method now receives `Draggable` instead of `HTMLElement`:

```diff
-onStart(_: PointerEvent, el: HTMLElement): void {
+onStart(_: PointerEvent, d: Draggable): void {
+  const el = d.element;
```
