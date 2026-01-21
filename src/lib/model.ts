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

export type TileProps<T extends TileType> = {
	tile: Tiles[T];
	parent: Tile | undefined;
	index: number;
	unmount: () => void;
	child: Snippet<[number]>;
};

export interface TileDefinition<T extends TileType> {
	default: Component<TileProps<T>, {}, 'tile' | 'parent'>;
	unmount: (tile: Tiles[T], index: number) => void;
}

export type TileDefinitions = { [T in TileType]: TileDefinition<T> };
