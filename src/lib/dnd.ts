import { DndContext, Droppable } from './shared/dnd.svelte.js';
import type { Tile } from './model.js';

export class TileDroppable<T extends Tile> extends Droppable<Tile, T> {
  constructor(
    ctx: DndContext<Tile>,
    public readonly targetTileId: string
  ) {
    super(ctx);
  }
}
