
export type StopReason = 'drop' | 'cancel';

export interface StopEvent {
  reason: StopReason;
}

export const ON_DRAG_START = Symbol('on-drag-start');
export const ON_MOVE = Symbol('on-move');
export const ON_DRAG_END = Symbol('on-end');
export interface DndPlugin<T> {
  [ON_DRAG_START]: (e: PointerEvent, draggable: Draggable<T>) => void;
  [ON_MOVE]: (e: PointerEvent) => void;
  [ON_DRAG_END]: (e: StopEvent, draggable: Draggable<T>) => void;
}

export interface Draggable<T> extends DndPlugin<T> {}

export const ACCEPTS = Symbol('accepts')
export const ON_DRAG_ENTER = Symbol('on-drag-enter')
export const ON_DRAG_OVER = Symbol('on-drag-over')
export const ON_DRAG_LEAVE = Symbol('on-drag-leave')
export const ON_DROP = Symbol('on-drop')
export interface Droppable<D = unknown, T extends D = D> {
  [ACCEPTS]: (draggable: Draggable<D>) => draggable is Draggable<T>;
  [ON_DRAG_ENTER]: ()
}

export interface DndOptions<
  D,
  P extends ReadonlyArray<DndPlugin<D>>,
> {
  plugins?: P;
}

export interface Dnd<D, P extends ReadonlyArray<DndPlugin<D>>> {}

export function createDnd<D, P extends ReadonlyArray<DndPlugin<D>>>(options: DndOptions<D, P>): Dnd<D, P> {

  return {}
}
