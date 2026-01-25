import { createContext } from 'svelte';

import { DndContext } from './shared/dnd.svelte.ts';

import type { Tile, TileComponent, Tiles, TileType } from './model.ts';

export const [getTilerContext, setTilerContext] = createContext<TilerContext>();

export interface TileDefinition<T extends TileType> {
  default: TileComponent<T>;
  removeChild: (ctx: TilerContext, tile: Tiles[T], index: number) => boolean;
}

export type TileDefinitions = { [T in TileType]: TileDefinition<T> };

export interface TilerContextOptions {
  tiles: TileDefinitions;
  parents?: WeakMap<Tile, Tile>;
  dnd?: DndContext<Tile>;
}

export class TilerContext {
  protected definitions: TileDefinitions;
  protected parents: WeakMap<Tile, Tile>;

  readonly dnd: DndContext<Tile>;

  constructor(options: TilerContextOptions) {
    this.definitions = $derived(options.tiles);
    this.dnd = $derived(options.dnd ?? new DndContext());
    this.parents = $derived(options.parents ?? new WeakMap());
  }

  registerParent(tile: Tile, parent: Tile) {
    this.parents.set(tile, parent);
  }

  getTileParent(tile: Tile) {
    return this.parents.get(tile);
  }

  getTileComponent(tile: Tile) {
    return this.definitions[tile.type].default;
  }

  removeChild(tile: Tile, index: number) {
    return this.definitions[tile.type].removeChild(this, tile as never, index);
  }
}
