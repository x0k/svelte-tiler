import { flushSync } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

import {
  ACTIONS,
  CLEANUP,
  DISPATCH,
  OP_DND,
  REGISTRY,
  STATE,
  type ActionInternals,
  type Dnd,
  type DndEventHandler,
  type DragOperation,
  type DragStatus,
  type Draggable,
  type Droppable,
  type DndEventType,
  type DndPlugin,
  type DispatchInternals,
  type Point,
  type PositionSnapshot,
  type RegistryEvent,
  type RegistryInternals,
  type StartOperationInit,
  type Shape,
  type TargetResolver,
  type Unsubscribe,
} from './model.js';
import { rectContains } from './collision.js';

export interface CreateDndOptions<Data = unknown> {
  plugins?: DndPlugin<Data>[];
  resolveTarget?: TargetResolver<Data>;
}

class Operation<Data> implements DragOperation<Data> {
  pointerId: number;
  sourceId: string = $state.raw('');
  targetId: string | undefined = $state.raw(undefined);
  current: Point = $state.raw({ x: 0, y: 0 });
  initial: Point;
  shape: Shape;
  scratch: Map<symbol, unknown> = new Map();
  [OP_DND]: Dnd<Data>;

  constructor(dnd: Dnd<Data>, init: StartOperationInit) {
    this.pointerId = init.pointerId;
    this[OP_DND] = dnd;
    this.initial = { ...init.point };
    this.shape = { ...init.shape };
    this.sourceId = init.sourceId;
    this.current = { ...init.point };
  }
}

/**
 * Creates a drag-drop context. Each context carries a single payload type
 * `Data`; use a union or base interface when different kinds of items are
 * dragged within one context.
 *
 * Dispose via `dnd[Symbol.dispose]()` (or `using dnd = createDnd(...)`) to
 * run plugin cleanups.
 */
export function createDnd<Data = unknown>(
  options: CreateDndOptions<Data> = {}
): Dnd<Data> {
  const draggables = new SvelteMap<string, Draggable<Data>>();
  const droppables = new SvelteMap<string, Droppable<Data>>();
  const registryListeners = new Set<(event: RegistryEvent<Data>) => void>();

  function notify(event: RegistryEvent<Data>) {
    for (const listener of [...registryListeners]) {
      listener(event);
    }
  }

  const registry: RegistryInternals<Data> = {
    draggables,
    droppables,
    addDraggable(entity) {
      draggables.set(entity.id, entity);
      notify({ type: 'draggable', entity, added: true });
    },
    addDroppable(entity) {
      droppables.set(entity.id, entity);
      notify({ type: 'droppable', entity, added: true });
    },
    removeDraggable(entity) {
      if (draggables.delete(entity.id)) {
        notify({ type: 'draggable', entity, added: false });
      }
    },
    removeDroppable(entity) {
      if (droppables.delete(entity.id)) {
        notify({ type: 'droppable', entity, added: false });
      }
    },
    subscribe(listener) {
      registryListeners.add(listener);
      return () => registryListeners.delete(listener);
    },
  };

  const operations = new SvelteMap<number, DragOperation<Data>>();

  const dispatchHandlers = new Map<DndEventType, Set<(event: never) => void>>();

  const dispatch: DispatchInternals = {
    emit(event) {
      const handlers = dispatchHandlers.get(event.type);
      if (!handlers) {
        return;
      }
      for (const handler of [...handlers]) {
        (handler as (e: typeof event) => void)(event);
      }
    },
    on(type, handler) {
      let handlers = dispatchHandlers.get(type);
      if (!handlers) {
        handlers = new Set();
        dispatchHandlers.set(type, handlers);
      }
      handlers.add(handler as (event: never) => void);
      return () => handlers.delete(handler);
    },
  };

  const actions: ActionInternals<Data> = {
    operations,
    resolveTarget(op) {
      return (options.resolveTarget ?? resolveTarget)(instance, op);
    },
    start(init) {
      const op = new Operation(instance, init);
      operations.set(op.pointerId, op);
      dispatch.emit({ type: 'start', op });
      return op;
    },
    move(pointerId, point, event) {
      const op = operations.get(pointerId);
      if (!op) {
        return;
      }
      op.current = { ...point };
      if (event) {
        dispatch.emit({ type: 'move', op, event });
      }
      const next = actions.resolveTarget(op);
      const nextId = next?.id;
      const source = draggables.get(op.sourceId);
      const nextHooks = next?.[STATE].options;
      const prevHooks =
        op.targetId !== undefined
          ? droppables.get(op.targetId)?.[STATE].options
          : undefined;
      if (op.targetId !== nextId) {
        if (source) {
          prevHooks?.onLeave?.(source, op);
          nextHooks?.onEnter?.(source, op);
        }
        op.targetId = nextId;
        dispatch.emit({ type: 'over', op, targetId: nextId });
      } else if (nextHooks && source) {
        nextHooks.onMove?.(source, op);
      }
    },
    stop(pointerId, opts = {}) {
      const op = operations.get(pointerId);
      if (!op) {
        return;
      }
      const source = draggables.get(op.sourceId);
      const target =
        op.targetId !== undefined ? droppables.get(op.targetId) : undefined;

      let reason: 'drop' | 'cancel' =
        !opts.canceled && target && source ? 'drop' : 'cancel';

      if (source) {
        const targetHooks = target?.[STATE].options;
        targetHooks?.onLeave?.(source, op);

        if (reason === 'drop') {
          let prevented = false;
          dispatch.emit({
            type: 'beforeDrop',
            op,
            preventDefault: () => {
              prevented = true;
            },
          });
          if (prevented) {
            reason = 'cancel';
          }
        }

        if (reason === 'drop') {
          const snapshot = $state.snapshot(source[STATE].options.data?.());
          dispatch.emit({ type: 'drop', op, data: snapshot });
          flushSync(() => {
            targetHooks?.onDrop?.(snapshot as never, source as never, op);
          });
        } else {
          dispatch.emit({ type: 'cancel', op });
        }
      } else {
        dispatch.emit({ type: 'cancel', op });
      }

      operations.delete(pointerId);

      dispatch.emit({ type: 'finish', op, reason });
    },
  };

  const instance: Dnd<Data> = Object.freeze({
    [REGISTRY]: registry,
    [ACTIONS]: actions,
    [DISPATCH]: dispatch,
    [CLEANUP]: [],
    [Symbol.dispose]: () => {
      for (const cleanup of instance[CLEANUP].splice(0)) {
        cleanup();
      }
    },
  });

  for (const plugin of options.plugins ?? []) {
    instance[CLEANUP].push(plugin(instance));
  }

  return instance;
}

// ── Accessors ──

/**
 * Default targeting strategy: among connected, non-disabled droppables that
 * accept the source, picks the one with the best detector score.
 */
export function resolveTarget<Data>(
  dnd: Dnd<Data>,
  op: DragOperation<Data>
): Droppable<Data> | undefined {
  const registry = dnd[REGISTRY];
  const draggable = registry.draggables.get(op.sourceId);
  if (!draggable) {
    return undefined;
  }
  let best: Droppable<Data> | undefined;
  let bestScore = Infinity;
  for (const droppable of registry.droppables.values()) {
    const state = droppable[STATE];
    if (droppable[STATE].disabled || !state.element?.isConnected) {
      continue;
    }
    if (!(state.options.accepts?.(draggable) ?? true)) {
      continue;
    }
    const rect = state.element.getBoundingClientRect();
    const score = (state.options.detect ?? rectContains)(
      { point: op.current, shape: op.shape },
      rect
    );
    if (score !== null && score < bestScore) {
      best = droppable;
      bestScore = score;
    }
  }
  return best;
}

export function operations<Data>(
  dnd: Dnd<Data>
): ReadonlyMap<number, DragOperation<Data>> {
  return dnd[ACTIONS].operations;
}

export function operation<Data>(
  dnd: Dnd<Data>
): DragOperation<Data> | undefined {
  return dnd[ACTIONS].operations.values().next().value;
}

export function status(dnd: Dnd<unknown>): DragStatus {
  return dnd[ACTIONS].operations.size > 0 ? 'dragging' : 'idle';
}

export function source<Data>(
  op: DragOperation<Data>
): Draggable<Data> | undefined {
  return op[OP_DND][REGISTRY].draggables.get(op.sourceId);
}

export function target<Data>(
  op: DragOperation<Data>
): Droppable<Data> | undefined {
  const registry = op[OP_DND][REGISTRY].droppables;
  return op.targetId !== undefined ? registry.get(op.targetId) : undefined;
}

export function position<Data>(op: DragOperation<Data>): PositionSnapshot {
  return {
    current: { ...op.current },
    initial: { ...op.initial },
  };
}

export function delta<Data>(op: DragOperation<Data>): Point {
  return {
    x: op.current.x - op.initial.x,
    y: op.current.y - op.initial.y,
  };
}

export function draggables<Data>(
  dnd: Dnd<Data>
): ReadonlyMap<string, Draggable<Data>> {
  return dnd[REGISTRY].draggables;
}

export function droppables<Data>(
  dnd: Dnd<Data>
): ReadonlyMap<string, Droppable<Data>> {
  return dnd[REGISTRY].droppables;
}

// ── Monitor ──

export function subscribe<K extends DndEventType, Data>(
  dnd: Dnd<Data>,
  type: K,
  handler: DndEventHandler<K, Data>
): Unsubscribe {
  return dnd[DISPATCH].on(type, handler as DndEventHandler<K>);
}
