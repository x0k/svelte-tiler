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
      get container() {
        return portalEl;
      },
    }),
  ],
});
```
