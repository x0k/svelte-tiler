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

	const [getContext, setContext] = createContext<Record<string, Snippet>>();

	export function setupLeafs<R extends Record<string, Snippet>>(leafs: R) {
		setContext(leafs);
		return (name: keyof R & string): Tiles['leaf'] => ({
			id: crypto.randomUUID(),
			type: 'leaf',
			name
		});
	}
</script>

<script lang="ts">
	const ctx = getContext();

	const { tile }: TileProps<'leaf'> = $props();
</script>

{@render ctx[tile.name]()}
