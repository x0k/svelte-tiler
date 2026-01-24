import { createContext } from 'svelte';

import { DndContext } from './shared/dnd.svelte.js';

import type { Tile, TileDefinitions } from './model.ts';
import { TILE_DEFINITIONS } from './internal.js';

export interface TilerContext {
	readonly [TILE_DEFINITIONS]: TileDefinitions;
	readonly dnd: DndContext<Tile>;
	readonly portalTarget: ShadowRoot | Document | Node;
}

export const [getTilerContext, setTilerContext] = createContext<TilerContext>();

export interface TilerContextOptions {
	tiles: TileDefinitions;
	dnd?: DndContext<Tile>;
	/** @default document.body */
	portalTarget?: ShadowRoot | Document | Node;
}

export function createTilerContext(options: TilerContextOptions): TilerContext {
	const defaultDndContext = new DndContext<Tile>();
	return {
		get [TILE_DEFINITIONS]() {
			return options.tiles;
		},
		get dnd() {
			return options.dnd ?? defaultDndContext;
		},
		get portalTarget() {
			return options.portalTarget ?? document.body;
		}
	};
}
