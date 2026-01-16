<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import { onDragStart, type DragStartHandlersFactory } from '$lib/shared/dnd.js';
	import { getTileComponent, getTilerContext } from '$lib/context.js';
	import type { Tile, Tiles } from '$lib/tile.js';

	declare module '../tile.js' {
		interface TileRegistry {
			tabs: {
				titles: string[];
				selectedTab: number;
				tabHeader?: string;
				empty?: string;
			};
		}
	}

	export interface TabsOptions<H extends string, E extends string> {
		tabs: [string, Tile][];
		selectedTab?: number;
		tabHeader?: H;
		empty?: E;
	}

	export function createTabs<H extends string, E extends string>(
		options: TabsOptions<H, E>
	): Tiles['tabs'] {
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
			tabHeader: options.tabHeader,
			empty: options.empty
		};
	}

	const TABS_CONTEXT_KEY = Symbol('tabs-context-key');

	interface TabsContext<H extends string = string, E extends string = string> {
		headers: Record<H, Snippet<[Tiles['tabs'], number]>>;
		empty: Record<E, Snippet<[Tiles['tabs']]>>;
	}

	export function setupTabs<H extends string, E extends string>(ctx: TabsContext<H, E>) {
		setContext(TABS_CONTEXT_KEY, ctx);
		return createTabs<H, E>;
	}
</script>

<script lang="ts">
	const { tile = $bindable() }: { tile: Tiles['tabs'] } = $props();

	const ctx = getTilerContext();
	const tabsCtx = getContext<TabsContext | undefined>(TABS_CONTEXT_KEY);

	const tabHeader = $derived(
		(tile.tabHeader !== undefined && tabsCtx?.headers[tile.tabHeader]) || defaultTabHeader
	);
	const empty = $derived((tile.empty !== undefined && tabsCtx?.empty[tile.empty]) || undefined);

	let draggedId = $state.raw<string | undefined>();

	const selectedTile = $derived(
		tile.children[tile.selectedTab] satisfies Tile as Tile | undefined
	);
	const TileComponent = $derived(selectedTile && getTileComponent(ctx, selectedTile));

	function reorderTabs(from: number, to: number) {
		const tabs = tile.children;
		const titles = tile.titles;
		const [moved] = tabs.splice(from, 1);
		const [movedTitle] = titles.splice(from, 1);

		tabs.splice(to, 0, moved);
		titles.splice(to, 0, movedTitle);

		if (tile.selectedTab === from) {
			tile.selectedTab = to;
		} else if (tile.selectedTab > from && tile.selectedTab <= to) {
			tile.selectedTab--;
		} else if (tile.selectedTab < from && tile.selectedTab >= to) {
			tile.selectedTab++;
		}
	}

	function handleDragStart(id: string, index: number): DragStartHandlersFactory {
		return () => {
			draggedId = id;

			let draggingTabIndex = index;
			return {
				onMove: (e) => {
					const over = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
					if (!over || !over.classList.contains('tab-header')) return;

					const overIndex = [...over.parentElement!.children].indexOf(over);
					if (overIndex === draggingTabIndex) return;

					reorderTabs(draggingTabIndex, overIndex);
					draggingTabIndex = overIndex;
				},
				onUp: () => {
					draggedId = undefined;
				}
			};
		};
	}
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
				onclick={() => (tile.selectedTab = i)}
				onkeydown={(e) => e.code === 'Enter' && (tile.selectedTab = i)}
				{@attach onDragStart(handleDragStart(t.id, i))}
				data-dragged={draggedId === t.id}
				data-selected={tile.selectedTab === i}
			>
				{@render tabHeader(tile, i)}
			</div>
		{/each}
	</div>
	<div class="tab-content">
		{#if TileComponent}
			<TileComponent bind:tile={tile.children[tile.selectedTab] as never} />
		{:else}
			{@render empty?.(tile)}
		{/if}
	</div>
</div>

<style>
	.tab-header {
		user-select: none;
		cursor: pointer;
		&[data-dragged='true'] {
			cursor: grabbing;
			opacity: 0.6;
		}
	}
</style>
