import { createContext } from 'svelte';

import { DndContext } from './shared/dnd.svelte.ts';

import type { Tile, TileComponent, Tiles, TileType } from './model.ts';

export const [getTilerContext, setTilerContext] = createContext<TilerContext>();

export interface TileDefinition<T extends TileType> {
  default: TileComponent<T>;
  onRemoveChild: (ctx: TilerContext, tile: Tiles[T], index: number) => void;
  onClear: (ctx: TilerContext, tile: Tiles[T]) => void;
}

export type TileDefinitions = { [T in TileType]: TileDefinition<T> };

export type TileEffects = {
  [T in TileType]?: (tile: Tiles[T]) => void | (() => void);
};

export interface TilerContextOptions {
  definitions: TileDefinitions;
  dnd?: DndContext<Tile>;
  effects?: TileEffects;
}

export class TilerContext {
  protected definitions: TileDefinitions;
  protected effects: TileEffects;
  protected updateRootFn: ((tile: Tile) => void) | undefined;
  protected tiles = new Map<string, Tile>();
  protected parents = new Map<string, Tile>();

  readonly dnd: DndContext<Tile>;

  constructor(options: TilerContextOptions) {
    this.definitions = options.definitions;
    this.dnd = options.dnd ?? new DndContext();
    this.effects = options.effects ?? {};
  }

  registerTile(tile: Tile, parent: Tile | ((tile: Tile) => void)) {
    const id = tile.id;
    if (typeof parent === 'function') {
      this.updateRootFn = parent;
    } else {
      this.parents.set(id, parent);
    }
    return () => {
      this.tiles.delete(id);
      this.parents.delete(id);
    };
  }

  getTileEffect(tile: Tile) {
    return this.effects[tile.type];
  }

  getTileComponent(tile: Tile) {
    return this.definitions[tile.type].default;
  }

  replaceWith(tileId: string, replace: Tile) {
    const parent = this.parents.get(tileId);
    if (parent) {
      const index = parent.children.findIndex((c) => c.id === tileId);
      if (index < 0) {
        throw new Error(`Invalid parent for "${tileId}" tile`);
      }
      parent.children[index] = replace;
    } else {
      this.updateRootFn?.(replace);
    }
  }

  removeChildFrom(tile: Tile, index: number) {
    this.definitions[tile.type].onRemoveChild(this, tile as never, index);
  }

  removeChildFromTile(tileId: string, index: number) {
    this.removeChildFrom(this.getTileById(tileId), index);
  }

  remove(tile: Tile) {
    const parent = this.parents.get(tile.id);
    if (parent === undefined) {
      this.definitions[tile.type].onClear(this, tile as never);
      return;
    }
    const index = parent.children.findIndex((c) => c.id === tile.id);
    if (index < 0) {
      throw new Error(`Invalid parent for "${tile.id}" tile`);
    }
    this.removeChildFrom(parent, index);
  }

  removeTile(tileId: string) {
    this.remove(this.getTileById(tileId));
  }

  protected getTileById(tileId: string) {
    const tile = this.tiles.get(tileId);
    if (tile === undefined) {
      throw new Error(`Unable to find tile with "${tileId}" id`);
    }
    return tile;
  }
}
