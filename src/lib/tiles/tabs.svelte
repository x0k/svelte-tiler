<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import type { Tile, Tiles } from '$lib/tile.js';
	import { getTileComponent, getTilerContext } from '$lib/context.js';

	declare module '../tile.js' {
		interface TileRegistry {
			tabs: {
				titles: string[];
				selectedTab: number;
				tabHeader?: string;
			};
		}
	}

	export interface TabsOptions<H extends string> {
		tabs: [string, Tile][];
		selectedTab?: number;
		tabHeader?: H;
	}

	export function createTabs<H extends string>(options: TabsOptions<H>): Tiles['tabs'] {
		const children: Tile[] = [];
		const titles: string[] = [];
		for (const tab of options.tabs) {
			titles.push(tab[0]);
			children.push(tab[1]);
		}
		return {
			id: crypto.randomUUID(),
			type: 'tabs',
			children,
			titles,
			selectedTab: options.selectedTab ?? 0,
			tabHeader: options.tabHeader
		};
	}

	const TABS_CONTEXT_KEY = Symbol();

	type TabsContext = Record<string, Snippet<[Tiles['tabs'], number]>>;

	export function setupTabs<C extends TabsContext>(ctx: C) {
		setContext(TABS_CONTEXT_KEY, ctx);
		return createTabs<keyof C & string>;
	}
</script>

<script lang="ts">
	const { tile = $bindable() }: { tile: Tiles['tabs'] } = $props();

	const ctx = getTilerContext();
	const tabsCtx: TabsContext | undefined = getContext(TABS_CONTEXT_KEY);

	const tabHeader = $derived(
		(tile.tabHeader !== undefined && tabsCtx?.[tile.tabHeader]) || defaultTabHeader
	);

	const selectedTile: Tile | undefined = $derived(tile.children![tile.selectedTab]);
	const TileComponent = $derived(selectedTile && getTileComponent(ctx, selectedTile));
</script>

{#snippet defaultTabHeader(t: Tiles['tabs'], index: number)}
	{t.titles[index]}
{/snippet}

<div class="tabs">
	<div class="tab-bar">
		{#each tile.children as t, i (t.id)}
			<div
				class="tab-header"
				role="tab"
				tabindex="0"
				onclick={() => {
					tile.selectedTab = i;
				}}
				onkeydown={(e) => {
					if (e.code !== 'Enter') {
						return;
					}
					tile.selectedTab = i;
				}}
			>
				{@render tabHeader(tile, i)}
			</div>
		{/each}
	</div>
	<div class="tab-content">
		<TileComponent bind:tile={tile.children![tile.selectedTab] as never} />
	</div>
</div>

<style>
</style>
