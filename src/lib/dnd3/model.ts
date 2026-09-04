export const REGISTRY = Symbol('dnd3.registry');
export const ACTIONS = Symbol('dnd3.actions');
export const DISPATCH = Symbol('dnd3.dispatch');
export const CLEANUP = Symbol('dnd3.cleanup');
export const OWNER = Symbol('dnd3.owner');
export const OP_DND = Symbol('dnd3.op-dnd');
export const DATA = Symbol('dnd3.data');
export const STATE = Symbol('dnd3.state');

export type Attachment<E extends Element = Element> = (
  element: E
) => void | (() => void);

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type Shape = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export interface PositionSnapshot {
  current: Point;
  initial: Point;
}

export type DragStatus = 'idle' | 'dragging';

export type StopReason = 'drop' | 'cancel';

export type Unsubscribe = () => void;

// ── Collision detection ──

export interface CollisionInput {
  point: Point;
  shape: Shape;
}

/** Returns a score (lower is better) or null when there is no hit. */
export type CollisionDetector = (
  input: CollisionInput,
  rect: DOMRect
) => number | null;

// ── Entities ──

export interface DraggableOptions<T> {
  id?: string;
  data?: () => T | undefined;
  disabled?: boolean;
}

export interface DropHooks<D = unknown, T extends D = D> {
  onEnter?(draggable: Draggable<D>, op: DragOperation): void;
  onMove?(draggable: Draggable<D>, op: DragOperation): void;
  onLeave?(draggable: Draggable<D>, op: DragOperation): void;
  onDrop?(data: T, draggable: Draggable<T>, op: DragOperation): void;
}

export interface DroppableOptions<
  D = unknown,
  T extends D = D,
> extends DropHooks<D, T> {
  id?: string;
  accepts?(draggable: Draggable<D>): draggable is Draggable<T>;
  detect?: CollisionDetector;
  disabled?: boolean;
}

/**
 * Bound element/handle plus the options object kept by reference — options
 * are read lazily so getters on consumer-supplied objects stay live.
 */
export interface DraggableEntityState<T> {
  element: HTMLElement | undefined;
  handle: HTMLElement | undefined;
  /** Reactive backing for the isDisabled/setDisabled functions. */
  disabled: boolean;
  options: DraggableOptions<T>;
}

export interface DroppableEntityState<D> {
  element: HTMLElement | undefined;
  /** Reactive backing for the isDisabled/setDisabled functions. */
  disabled: boolean;
  options: DroppableOptions<D>;
}

export interface OwnerRef {
  readonly dnd: Dnd<unknown>;
}

export interface Draggable<T = unknown> {
  readonly id: string;
  readonly [OWNER]: OwnerRef;
  readonly [STATE]: DraggableEntityState<T>;
  readonly [DATA]?: T;
}

export interface Droppable<D = unknown> {
  readonly id: string;
  readonly [OWNER]: OwnerRef;
  readonly [STATE]: DroppableEntityState<D>;
  readonly [DATA]?: D;
}

// ── Drag operation ──

export interface DragOperation<Data = unknown> {
  readonly pointerId: number;
  sourceId: string;
  targetId: string | undefined;
  current: Point;
  initial: Point;
  shape: Shape;
  scratch: Map<symbol, unknown>;
  readonly [OP_DND]: Dnd<Data>;
}

// ── Registry ──

export type RegistryEvent<Data = unknown> =
  | { type: 'draggable'; entity: Draggable<Data>; added: boolean }
  | { type: 'droppable'; entity: Droppable<Data>; added: boolean };

export interface RegistryInternals<Data = unknown> {
  readonly draggables: ReadonlyMap<string, Draggable<Data>>;
  readonly droppables: ReadonlyMap<string, Droppable<Data>>;
  addDraggable(entity: Draggable<Data>): void;
  addDroppable(entity: Droppable<Data>): void;
  removeDraggable(entity: Draggable<Data>): void;
  removeDroppable(entity: Droppable<Data>): void;
  subscribe(listener: (event: RegistryEvent<Data>) => void): Unsubscribe;
}

// ── Actions ──

export interface StartOperationInit {
  pointerId: number;
  sourceId: string;
  point: Point;
  shape: Shape;
}

export interface StopOperationOptions {
  canceled?: boolean;
  event?: Event;
}

export interface TargetResolver<Data = unknown> {
  (dnd: Dnd<Data>, op: DragOperation<Data>): Droppable<Data> | undefined;
}

export interface ActionInternals<Data = unknown> {
  readonly operations: ReadonlyMap<number, DragOperation<Data>>;
  /**
   * Resolves the drop target for an operation. Swappable by plugins that
   * need custom targeting strategies.
   */
  resolveTarget(op: DragOperation<Data>): Droppable<Data> | undefined;
  start(init: StartOperationInit): DragOperation<Data>;
  move(pointerId: number, point: Point, event?: PointerEvent): void;
  stop(pointerId: number, options?: StopOperationOptions): void;
}

// ── Events ──

export interface DndEventMap<Data = unknown> {
  start: { op: DragOperation<Data> };
  move: { op: DragOperation<Data>; event: PointerEvent };
  over: { op: DragOperation<Data>; targetId: string | undefined };
  beforeDrop: { op: DragOperation<Data>; preventDefault(): void };
  drop: { op: DragOperation<Data>; data: Data | undefined };
  cancel: { op: DragOperation<Data> };
  finish: { op: DragOperation<Data>; reason: StopReason };
}

export type DndEventType = keyof DndEventMap;

export type DndEvent<Data = unknown> = {
  [K in keyof DndEventMap<Data>]: { type: K } & DndEventMap<Data>[K];
}[DndEventType];

export type DndEventHandler<K extends DndEventType, Data = unknown> = (
  event: { type: K } & DndEventMap<Data>[K]
) => void;

// ── Plugins ──

export type DndPlugin<Data = unknown> = (dnd: Dnd<Data>) => Unsubscribe;

// ── Context ──

export interface DispatchInternals {
  emit<K extends DndEventType>(
    event: { type: K } & DndEventMap<unknown>[K]
  ): void;
  on<K extends DndEventType>(type: K, handler: DndEventHandler<K>): Unsubscribe;
}

export interface Dnd<Data = unknown> {
  readonly [REGISTRY]: RegistryInternals<Data>;
  readonly [ACTIONS]: ActionInternals<Data>;
  readonly [DISPATCH]: DispatchInternals;
  readonly [CLEANUP]: Unsubscribe[];
  readonly [DATA]?: Data;
  [Symbol.dispose]: () => void;
}
