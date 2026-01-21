import { createContext, type Component } from 'svelte';

import { DndContext } from './shared/dnd.svelte.js';

import type { Tile, TileProps, TileType } from './tile.js';
import { TILER_COMPONENTS } from './internal.js';

export type TilerComponents = { [T in TileType]: Component<TileProps<T>, {}, 'tile'> };

export interface TilerContext {
	readonly [TILER_COMPONENTS]: TilerComponents;
	readonly dnd: DndContext<Tile>;
}

export const [getTilerContext, setTilerContext] = createContext<TilerContext>();

export function getTileComponent(ctx: TilerContext, tile: Tile) {
	return ctx[TILER_COMPONENTS][tile.type];
}

export interface TilerContextOptions {
	components: TilerComponents;
	dnd?: DndContext<Tile>;
}

export function createTilerContext(options: TilerContextOptions): TilerContext {
	const defaultDndContext = new DndContext<Tile>();
	return {
		get [TILER_COMPONENTS]() {
			return options.components;
		},
		get dnd() {
			return options.dnd ?? defaultDndContext;
		}
	};
}
