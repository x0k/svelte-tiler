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
  parents?: WeakMap<Tile, Tile>;
  dnd?: DndContext<Tile>;
  effects?: TileEffects;
}

export class TilerContext {
  protected definitions: TileDefinitions;
  protected parents: WeakMap<Tile, Tile>;
  protected effects: TileEffects;
  protected updateRootFn: ((tile: Tile) => void) | undefined;

  readonly dnd: DndContext<Tile>;

  constructor(options: TilerContextOptions) {
    this.definitions = options.definitions;
    this.dnd = options.dnd ?? new DndContext();
    // NOTE:
    this.parents = options.parents ?? new WeakMap();
    this.effects = options.effects ?? {};
  }

  registerTile(tile: Tile, parent: Tile | ((tile: Tile) => void)) {
    if (typeof parent === 'function') {
      this.parents.delete(tile);
      this.updateRootFn = parent;
    } else {
      this.parents.set(tile, parent);
    }
  }

  getTileEffect(tile: Tile) {
    return this.effects[tile.type];
  }

  getTileComponent(tile: Tile) {
    return this.definitions[tile.type].default;
  }

  replaceWith(tile: Tile, replace: Tile) {
    const parent = this.parents.get(tile);
    if (parent) {
      const index = parent.children.findIndex((c) => c.id === tile.id);
      if (index < 0) {
        throw new Error(`Invalid parent for "${tile.id}" tile`);
      }
      parent.children[index] = replace;
    } else {
      this.updateRootFn?.(replace);
    }
  }

  removeChild(tile: Tile, index: number) {
    return this.definitions[tile.type].onRemoveChild(
      this,
      tile as never,
      index
    );
  }

  destroy(tile: Tile) {
    const parent = this.parents.get(tile);
    if (parent === undefined) {
      this.definitions[tile.type].onClear(this, tile as never);
      return;
    }
    const index = parent.children.findIndex((c) => c.id === tile.id);
    if (index < 0) {
      throw new Error(`Invalid parent for "${tile.id}" tile`);
    }
    this.removeChild(parent, index);
  }
}
