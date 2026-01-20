<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

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

	const EDGE_RATIO = 0.3;

	class DroppableSurface extends Droppable<Tile> {
		horizontal: EdgePart | undefined = $state.raw();
		vertical: EdgePart | undefined = $state.raw();

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
			const i = this.#index + (this.horizontal === 'start' ? 0 : 1);
			tile.children.splice(i, 0, ...children);
			tile.titles.splice(i, 0, ...titles);
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
			const index = this.getIndex();
			tile.children.splice(index, 1);
			tile.titles.splice(index, 1);
		}

		private getIndex() {
			const c = tile.children;
			const i = this.#index;
			if (i - 1 < c.length && c[i + 1].id === this.#id) {
				return i + 1;
			}
			if (i > 0 && c[i - 1].id === this.#id) {
				return i - 1;
			}
			return i;
		}
	}
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
