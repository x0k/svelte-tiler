import {
  DndContext,
  Draggable,
  Droppable,
  type DraggableOptions,
} from './shared/dnd.svelte.js';
import type { Tile } from './model.js';

export class TileDropTarget<T extends Tile> extends Droppable<Tile, T> {
  constructor(
    ctx: DndContext<Tile>,
    public readonly targetTileId: string
  ) {
    super(ctx);
  }
}

export interface TileDragSourceOptions extends DraggableOptions<Tile> {
  sourceTargetId: string;
  sourceIndex: number;
}

export class TileDragSource extends Draggable<Tile> {
  readonly sourceTargetId: string;
  readonly sourceIndex: number;

  constructor(ctx: DndContext<Tile>, options: TileDragSourceOptions) {
    super(ctx, options);
    this.sourceTargetId = options.sourceTargetId;
    this.sourceIndex = options.sourceIndex;
  }
}
