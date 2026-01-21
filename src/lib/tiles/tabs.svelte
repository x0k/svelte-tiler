<script lang="ts" module>
	import { createContext, type Snippet } from 'svelte';

	import {
		ClonedGhost,
		DndContext,
		Draggable,
		Droppable,
		type DraggableOptions,
		type StopEvent
	} from '$lib/shared/dnd.svelte.js';
	import type { Registry } from '$lib/shared/registry.js';
	import { getRectParts, type EdgePart } from '$lib/shared/geometry.js';
	import { getTilerContext } from '$lib/context.js';
	import type { Tile, TileProps, Tiles } from '$lib/model.js';

	declare module '../model.js' {
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

	function createTabs<H extends string, E extends string>(
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

	interface TabsContext<H extends string = string, E extends string = string> {
		// createRow: (a: Tiles['tabs'], b: Tiles['tabs']) => Tile;
		// createColumn: (a: Tiles['tabs'], b: Tiles['tabs']) => Tile;
		headers?: Registry<H, Snippet<[Tiles['tabs'], number]> | undefined>;
		empty?: Registry<E, Snippet<[Tiles['tabs']]> | undefined>;
	}
	const [getTabsContext, setTabsContext] = createContext<TabsContext>();

	export function setupTabs<H extends string, E extends string>(ctx: TabsContext<H, E>) {
		setTabsContext(ctx);
		return createTabs<H, E>;
	}

	export function unmount(tile: Tiles['tabs'], i: number) {
		tile.children.splice(i, i);
		tile.titles.splice(i, i);
	}
</script>

<script lang="ts">
	let { tile = $bindable(), unmount, child }: TileProps<'tabs'> = $props();

	const ctx = getTilerContext();
	const tabsCtx = getTabsContext();

	const tabHeader = $derived(
		(tile.tabHeader !== undefined && tabsCtx?.headers?.get(tile.tabHeader)) || defaultTabHeader
	);
	const empty = $derived(
		(tile.empty !== undefined && tabsCtx?.empty?.get(tile.empty)) || undefined
	);

	const EDGE_RATIO = 0.25;

	class DroppableSurface extends Droppable<Tile> {
		hpart: EdgePart | undefined = $state.raw();
		vpart: EdgePart | undefined = $state.raw();

		accepts(t: Tile | undefined): t is Tiles['tabs'] {
			return t?.type === 'tabs';
		}

		onMove(e: PointerEvent) {
			const rect = this.element!.getBoundingClientRect();
			Object.assign(this, getRectParts(rect, e.clientX, e.clientY, EDGE_RATIO));
		}
	}

	class DroppableTab extends DroppableSurface {
		#index: number;

		constructor(ctx: DndContext<Tile>, index: number) {
			super(ctx);
			this.#index = index;
		}

		protected onDrop({ titles, children }: Tiles['tabs']): void {
			const i = this.#index + (this.hpart === 'start' ? 0 : 1);
			tile.children.splice(i, 0, ...children);
			tile.titles.splice(i, 0, ...titles);
		}
	}

	class DroppableContent extends DroppableSurface {
		protected onDrop(tabs: Tiles['tabs']): void {
			if (tabs.children.length < 1) {
				return;
			}
			const id = tabs.children[0].id;
			if (this.hpart === 'center' && this.vpart === 'center') {
				const i = tile.children.findIndex((t) => t.id === id);
				if (i < 0) {
					const l = tile.children.push(...tabs.children);
					tile.titles.push(...tabs.titles);
					tile.selectedTab = l - 1;
				} else {
					tile.children.splice(i, 0, ...tabs.children);
					tile.titles.splice(i, 0, ...tabs.titles);
					tile.selectedTab = i;
				}
			} else if (this.hpart === 'start') {
				// replace(tabsCtx.createRow(tabs, tile));
			}
		}
	}

	interface DraggableTabOptions extends DraggableOptions<Tile> {
		id: string;
		index: number;
	}

	class DraggableTab extends Draggable<Tile> {
		#id: string;
		#index: number;

		constructor(ctx: DndContext<Tile>, options: DraggableTabOptions) {
			super(ctx, options);
			this.#id = options.id;
			this.#index = options.index;
		}

		protected feedback(e: PointerEvent, el: HTMLElement) {
			return new ClonedGhost(el, e).attach();
		}

		protected onStop({ reason }: StopEvent): void {
			if (reason !== 'drop') {
				return;
			}
			if (tile.children.length === 1) {
				unmount();
			} else {
				const index = this.getIndex();
				tile.children.splice(index, 1);
				tile.titles.splice(index, 1);
			}
		}

		private getIndex() {
			const c = tile.children;
			const i = this.#index;
			if (i + 1 < c.length && c[i + 1].id === this.#id) {
				return i + 1;
			}
			if (i > 0 && c[i - 1].id === this.#id) {
				return i - 1;
			}
			return i;
		}
	}

	const droppableContent = $derived(new DroppableContent(ctx.dnd));
</script>

{#snippet defaultTabHeader(t: Tiles['tabs'], index: number)}
	{t.titles[index]}
{/snippet}

<div class="tabs">
	<div class="tab-bar">
		{#each tile.children as t, i (t.id)}
			{@const droppable = new DroppableTab(ctx.dnd, i)}
			{@const draggable = new DraggableTab(ctx.dnd, {
				id: t.id,
				index: i,
				data: createTabs({
					...tile,
					tabs: [[tile.titles[i], t]]
				})
			})}
			<button
				{@attach droppable.register}
				{@attach draggable.register}
				class="tab-header"
				role="tab"
				onclick={() => (tile.selectedTab = i)}
				data-dragged={draggable.isDragged}
				data-over={droppable.isOver}
				data-selected={tile.selectedTab === i}
				data-hpart={droppable.hpart}
				data-vpart={droppable.vpart}
			>
				{@render tabHeader(tile, i)}
			</button>
		{/each}
	</div>
	<div
		class="tab-content"
		{@attach droppableContent.register}
		data-over={droppableContent.isOver}
		data-hpart={droppableContent.hpart}
		data-vpart={droppableContent.vpart}
		style="--drop-edge-size: {EDGE_RATIO * 100}%"
	>
		{#if tile.children[tile.selectedTab]}
			{@render child(tile.selectedTab)}
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
