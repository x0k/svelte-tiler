<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import {
		ClonedGhost,
		Draggable,
		Droppable,
		type PointerEventWithTarget
	} from '$lib/shared/dnd.svelte.js';
	import type { Registry } from '$lib/shared/registry.js';
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
		headers?: Registry<H, Snippet<[Tiles['tabs'], number]> | undefined>;
		empty?: Registry<E, Snippet<[Tiles['tabs']]> | undefined>;
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
		(tile.tabHeader !== undefined && tabsCtx?.headers?.get(tile.tabHeader)) || defaultTabHeader
	);
	const empty = $derived(
		(tile.empty !== undefined && tabsCtx?.empty?.get(tile.empty)) || undefined
	);

	const selectedTile = $derived(tile.children[tile.selectedTab] satisfies Tile as Tile | undefined);
	const TileComponent = $derived(selectedTile && getTileComponent(ctx, selectedTile));

	class DroppableTab extends Droppable {
		horizontal: 'left' | 'center' | 'right' | undefined = $state.raw();
		vertical: 'top' | 'center' | 'bottom' | undefined = $state.raw();

		onMove(e: PointerEvent) {
			if (this._element === undefined) {
				return;
			}
			const rect = this._element.getBoundingClientRect();

			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			const EDGE_RATIO = 0.3;

			const left = rect.width * EDGE_RATIO;
			const right = rect.width * (1 - EDGE_RATIO);
			const top = rect.height * EDGE_RATIO;
			const bottom = rect.height * (1 - EDGE_RATIO);

			this.horizontal = this.isOver
				? x < left
					? 'left'
					: x > right
						? 'right'
						: 'center'
				: undefined;
			this.vertical = this.isOver
				? y < top
					? 'top'
					: y > bottom
						? 'bottom'
						: 'center'
				: undefined;
		}
	}
	class DraggableTab extends Draggable {
		protected feedback(el: HTMLElement, e: PointerEvent) {
			return new ClonedGhost(el, e).attach();
		}
	}
</script>

{#snippet defaultTabHeader(t: Tiles['tabs'], index: number)}
	{t.titles[index]}
{/snippet}

<div class="tabs">
	<div class="tab-bar">
		{#each tile.children as t, i (t.id)}
			{@const droppable = new DroppableTab(ctx.dnd)}
			{@const draggable = new DraggableTab(ctx.dnd, () => t)}
			<button
				{@attach droppable.register}
				{@attach draggable.register}
				class="tab-header"
				role="tab"
				onclick={() => (tile.selectedTab = i)}
				data-dragged={draggable.isDragged}
				data-over={droppable.isOver}
				data-selected={tile.selectedTab === i}
				data-horizontal={droppable.horizontal}
				data-vertical={droppable.vertical}
			>
				{@render tabHeader(tile, i)}
			</button>
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
