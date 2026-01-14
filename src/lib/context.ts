import { createContext, type Component } from 'svelte';

import type { Tile, TileProps, TileType } from './tile.js';
import { TILER_COMPONENTS } from './internal.js';

export type TileComponents = { [T in TileType]: Component<TileProps<T>> };

export interface TilerContext {
	[TILER_COMPONENTS]: TileComponents;
}

export const [getTilerContext, setTilerContext] = createContext<TilerContext>();

export function getTileComponent(ctx: TilerContext, tile: Tile) {
	return ctx[TILER_COMPONENTS][tile.type];
}
