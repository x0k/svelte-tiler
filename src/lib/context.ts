import { createContext } from 'svelte';

import { DndContext } from './shared/dnd.svelte.ts';

import type {
  Tile,
  TileComponent,
  TileInsertData,
  Tiles,
  TileType,
} from './model.js';

export const [getTilerContext, setTilerContext] = createContext<TilerContext>();

export interface TileDefinition<T extends TileType> {
  default: TileComponent<T>;
  onRemoveChild: (ctx: TilerContext, tile: Tiles[T], index: number) => void;
  onInsert: (
    ctx: TilerContext,
    tile: Tiles[T],
    index: number,
    data: TileInsertData<T>
  ) => void;
  onClear: (ctx: TilerContext, tile: Tiles[T]) => void;
}

export type TileDefinitions = { [T in TileType]: TileDefinition<T> };

export interface TilerContextOptions {
  definitions: TileDefinitions;
  dnd?: DndContext<Tile>;
}

export class TilerContext {
  protected definitions: TileDefinitions;
  protected updateRootFn: ((tile: Tile) => void) | undefined;

  protected registry = new FinalizationRegistry<string>((id) => {
    this.tiles.delete(id);
  });
  protected tiles = new Map<string, WeakRef<Tile>>();
  protected parents = new WeakMap<Tile, Tile>();

  readonly dnd: DndContext<Tile>;

  constructor(options: TilerContextOptions) {
    this.definitions = options.definitions;
    this.dnd = options.dnd ?? new DndContext();
  }

  registerTile(
    tile: Tile,
    parent: Tile | ((tile: Tile) => void)
  ): (() => void) | void {
    this.tiles.set(tile.id, new WeakRef(tile));
    this.registry.register(tile, tile.id);
    if (typeof parent === 'function') {
      this.parents.delete(tile);
      this.updateRootFn = parent;
    } else {
      this.parents.set(tile, parent);
    }
  }

  getTileComponent(tile: Tile) {
    return this.definitions[tile.type].default;
  }

  replace(tile: Tile | undefined, replace: Tile) {
    if (tile) {
      const parent = this.parents.get(tile);
      if (parent) {
        const index = parent.children.findIndex((c) => c.id === tile.id);
        if (index < 0) {
          throw new Error(`Invalid parent for "${tile.id}" tile`);
        }
        parent.children[index] = replace;
        return;
      }
    }
    this.updateRootFn?.(replace);
  }

  replaceTile(tileId: string | undefined, replace: Tile) {
    const tile = tileId && this.getTileById(tileId);
    this.replace(tile || undefined, replace);
  }

  insertInto<T extends TileType>(
    tile: Tiles[T],
    index: number,
    data: TileInsertData<T>
  ) {
    this.definitions[tile.type].onInsert(this, tile, index, data);
  }

  insertIntoTile<T extends TileType>(
    tileId: string,
    type: T,
    index: number,
    data: TileInsertData<T>
  ) {
    const tile = this.getTileById(tileId);
    if (tile.type !== type) {
      throw new Error(
        `Tile type mismatch: expected "${type}", but got "${tile.type}"`
      );
    }
    this.insertInto(tile as Tiles[T], index, data);
  }

  removeChildFrom(tile: Tile, index: number) {
    this.definitions[tile.type].onRemoveChild(this, tile as never, index);
  }

  removeChildFromTile(tileId: string, index: number) {
    this.removeChildFrom(this.getTileById(tileId), index);
  }

  remove(tile: Tile) {
    const parent = this.parents.get(tile);
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
    const tile = this.tiles.get(tileId)?.deref();
    if (tile === undefined) {
      throw new Error(`Unable to find tile with "${tileId}" id`);
    }
    return tile;
  }
}
