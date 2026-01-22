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

	function create<H extends string, E extends string>(options: TabsOptions<H, E>): Tiles['tabs'] {
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

	interface SplitOptions {
		type: 'row' | 'column';
		parent: Tile | undefined;
		pivot: Tiles['tabs'];
		offset: number;
		adjacent: Tiles['tabs'];
	}

	interface TabsContext<H extends string = string, E extends string = string> {
		createSplit: (options: SplitOptions) => Tile;
		headers?: Registry<H, Snippet<[Tiles['tabs'], number]> | undefined>;
		empty?: Registry<E, Snippet<[Tiles['tabs']]> | undefined>;
	}

	const [getTabsContext, setTabsContext] = createContext<TabsContext>();

	export function setup<H extends string, E extends string>(ctx: TabsContext<H, E>) {
		setTabsContext(ctx);
		return create<H, E>;
	}

	export function unmount(tile: Tiles['tabs'], i: number) {
		tile.children.splice(i, 1);
		tile.titles.splice(i, 1);
	}
</script>

<script lang="ts">
	let {
		tile = $bindable(),
		parent = $bindable(),
		unmount: destroy,
		child
	}: TileProps<'tabs'> = $props();

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
			return (
				t?.type === 'tabs' &&
				// NOTE: In most cases `t.children.length === 1` is expected
				(tile.children.length !== 1 || t.children.every((c) => c.id !== tile.children[0].id))
			);
		}

		onMove(e: PointerEvent) {
			const rect = this.element!.getBoundingClientRect();
			Object.assign(this, getRectParts(rect, e.clientX, e.clientY, EDGE_RATIO));
		}
	}

	class DroppableTab extends DroppableSurface {
		#id: string;

		constructor(ctx: DndContext<Tile>, id: string) {
			super(ctx);
			this.#id = id;
		}

		accepts(t: Tile | undefined): t is Tiles['tabs'] {
			return super.accepts(t) && t.children.every((c) => c.id !== this.#id);
		}

		protected onDrop({ titles, children }: Tiles['tabs']): void {
			const index = tile.children.findIndex((c) => c.id === this.#id);
			if (index < 0) {
				return;
			}
			const i = index + (this.hpart === 'start' ? 0 : 1);
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
			} else {
				parent = tabsCtx.createSplit({
					parent,
					type: this.hpart === 'start' || this.hpart === 'end' ? 'row' : 'column',
					pivot: tile,
					adjacent: tabs,
					offset:
						this.hpart === 'start' ? 0 : this.hpart === 'end' ? 1 : this.vpart === 'start' ? 0 : 1
				});
			}
		}
	}

	interface DraggableTabOptions extends DraggableOptions<Tile> {
		index: number;
	}

	class DraggableTab extends Draggable<Tile> {
		#index: number;

		constructor(ctx: DndContext<Tile>, options: DraggableTabOptions) {
			super(ctx, options);
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
				destroy();
			} else {
				unmount(tile, this.#index);
			}
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
			{@const droppable = new DroppableTab(ctx.dnd, t.id)}
			{@const draggable = new DraggableTab(ctx.dnd, {
				index: i,
				data: create({
					...tile,
					tabs: [[tile.titles[i], t]],
					selectedTab: 0
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
