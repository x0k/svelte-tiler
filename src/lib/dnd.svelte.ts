import type { Attachment } from 'svelte/attachments';

import type { Tile } from './tile.ts';

export interface DraggableOptions {
	tile: Tile;
	umount: () => void;
}

export interface Draggable {
	isDragged: boolean;
	attachment: Attachment<HTMLElement>;
}

export interface DroppableOptions<T extends Tile> {
	accept: (tile: Tile) => tile is T;
	onDrop: (tile: T) => void;
}

export interface Droppable {
	isReady: boolean;
	isOver: boolean;
	attachment: Attachment<HTMLElement>;
}
