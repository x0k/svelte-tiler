<script lang="ts" module>
	import { createContext, type Snippet } from 'svelte';

	import type { Registry } from '$lib/shared/registry.js';
	import type { TileProps, Tiles } from '$lib/tile.js';

	declare module '../tile.js' {
		interface TileRegistry {
			leaf: {
				name: string;
			};
		}
	}

	type LeafContext<N extends string = string> = Registry<N, Snippet<[Tiles['leaf']]> | undefined>;

	const [getContext, setContext] = createContext<LeafContext>();

	export function setupLeafs<N extends string>(leafs: LeafContext<N>) {
		setContext(leafs);
		return (name: N): Tiles['leaf'] => ({
			id: crypto.randomUUID(),
			type: 'leaf',
			name,
			children: []
		});
	}
</script>

<script lang="ts">
	const leafCtx = getContext();

	let { tile = $bindable() }: TileProps<'leaf'> = $props();
</script>

{@render leafCtx.get(tile.name)?.(tile)}
