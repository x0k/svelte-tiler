import type { Component, Snippet } from 'svelte';

export interface TileBase<T extends TileType> {
  id: string;
  type: T;
  children: Tile[];
}

export interface TileRegistry {}

export type TileType = keyof TileRegistry;

export type Tiles = {
  [T in TileType]: TileBase<T> & TileRegistry[T];
};

export type Tile = Tiles[TileType];

export interface TileInsertRequirements {}

type WithOnlyRequired<T, K extends keyof T> = Required<Pick<T, K>> &
  Partial<Omit<T, K>>;

export type TileInsertData<T extends TileType> = WithOnlyRequired<
  Tiles[T],
  | (T extends keyof TileInsertRequirements
      ? TileInsertRequirements[T] & keyof Tiles[T]
      : never)
  | 'children'
>;

export type TileProps<T extends TileType> = {
  tile: Tiles[T];
  parent: Tile | undefined;
  index: number;
  child: Snippet<[number]>;
};

export type TileComponent<T extends TileType> = Component<
  TileProps<T>,
  {},
  'tile'
>;

export type TileArrayProperties<T extends TileType> = {
  [K in keyof Tiles[T] as Tiles[T][K] extends Array<any>
    ? K
    : never]: Tiles[T][K];
};

export type TileArrayProperty<T extends TileType> =
  keyof TileArrayProperties<T>;

/**
 * @returns Returns the insertion position taking into account removed duplicates
 */
export function insertWithDeduplication<T extends TileType>(
  tile: Tiles[T],
  i: number,
  arrays: {
    [K in Exclude<TileArrayProperty<T>, 'children'>]?: Tiles[T][K &
      keyof Tiles[T]];
  } & {
    children: Tile[];
  }
) {
  const newIds = new Set(arrays.children.map((c) => c.id));
  let write = 0;
  let shift = 0;
  const c = tile.children;
  const l = c.length;
  const keys = Object.keys(arrays) as TileArrayProperty<T>[];
  const tileArrays = keys.map((arr) => tile[arr]);
  for (let read = 0; read < l; read++) {
    if (!newIds.has(c[read].id)) {
      for (const arr of tileArrays) {
        // @ts-expect-error ignore
        arr[write] = arr[read];
      }
      write++;
    } else if (read < i) {
      shift++;
    }
  }
  i -= shift;
  for (const key of keys) {
    // @ts-expect-error ignore
    tile[key].length = write;
    // @ts-expect-error ignore
    tile[key].splice(i, 0, ...arrays[key]);
  }
  return i;
}
