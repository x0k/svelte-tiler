<script lang="ts" module>
  import { createContext, type Snippet } from 'svelte';

  import type { Registry } from '$lib/shared/registry.js';
  import type { TileProps, Tiles } from '$lib/model.js';

  declare module '../model.js' {
    interface TileRegistry {
      leaf: {
        name: string;
      };
    }
  }

  type LeafContext<N extends string = string> = Registry<
    N,
    Snippet<[Tiles['leaf']]> | undefined
  >;

  const [getContext, setContext] = createContext<LeafContext>();

  export function setup<N extends string>(leafs: LeafContext<N>) {
    setContext(leafs);
    return (name: N): Tiles['leaf'] => ({
      id: crypto.randomUUID(),
      type: 'leaf',
      name,
      children: [],
    });
  }

  export function onRemoveChild() {}

  export function onClear() {}
</script>

<script lang="ts">
  const leafCtx = getContext();

  let { tile = $bindable() }: TileProps<'leaf'> = $props();
</script>

{@render leafCtx.get(tile.name)?.(tile)}
