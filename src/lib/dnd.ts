import {
  DragSource,
  DropTarget,
  type Draggable,
  type DragSourceOptions,
  type StopEvent,
} from './shared/dnd.svelte.js';
import type { Tile } from './model.js';
import type { TilerContext } from './context.ts';

export class TileDropTarget<T extends Tile> extends DropTarget<Tile, T> {
  protected tilerCtx: TilerContext;

  constructor(
    ctx: TilerContext,
    public readonly tileId: string
  ) {
    super(ctx.dnd);
    this.tilerCtx = ctx;
  }

  getTargetTileId(): string | undefined {
    return this.tileId;
  }

  protected isOwnChild(d: Draggable): d is TileDragSource {
    return d instanceof TileDragSource && this.tileId === d.parentTileId;
  }
}

export interface TileDragSourceOptions extends DragSourceOptions<Tile> {
  parentTileId: string;
  childIndex: number;
}

export class TileDragSource extends DragSource<Tile> {
  protected tilerCtx: TilerContext;

  readonly parentTileId: string;
  readonly childIndex: number;

  constructor(ctx: TilerContext, options: TileDragSourceOptions) {
    super(ctx.dnd, options);
    this.tilerCtx = ctx;
    this.parentTileId = options.parentTileId;
    this.childIndex = options.childIndex;
  }

  onStop({ reason }: StopEvent): void {
    if (reason !== 'drop') {
      return;
    }
    this.tilerCtx.removeChildFromTile(this.parentTileId, this.childIndex);
  }
}
