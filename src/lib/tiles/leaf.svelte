<script lang="ts" module>
	import { createContext, type Snippet } from 'svelte';

	import type { TileProps, Tiles } from '$lib/tile.js';

	declare module '../tile.js' {
		interface TileRegistry {
			leaf: {
				name: string;
			};
		}
	}

	const [getContext, setContext] = createContext<Record<string, Snippet<[Tiles['leaf']]>>>();

	export function setupLeafs<N extends string>(leafs: Record<N, Snippet>) {
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
	const ctx = getContext();

	let { tile = $bindable() }: TileProps<'leaf'> = $props();
</script>

{@render ctx[tile.name](tile)}
