---
'svelte-tiler': minor
---

[BREAKING] Change the tab header signature to `Snippet<[HTMLAttributes<HTMLElement>, Tiles['tabs'], number, Draggable<Tile>]>`

Now the root element must be rendered in the snippet, example:

```svelte
{#snippet myTabHeader(props: HTMLAttributes<HTMLElement>, t: Tiles['tabs'], i: number)}
  <div {...props}>
    {t.titles[i]}
  </div>
{/snippet}
```
