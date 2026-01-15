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

export type TileProps<T extends TileType> = { tile: Tiles[T] };
