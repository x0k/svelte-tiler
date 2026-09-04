import {
  ACTIONS,
  OWNER,
  REGISTRY,
  STATE,
  type Attachment,
  type Draggable,
  type DraggableEntityState,
  type DraggableOptions,
  type Dnd,
  type Droppable,
  type DroppableEntityState,
  type DroppableOptions,
} from './model.js';

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

// Options are stored by reference and read lazily, so getters on the
// consumer's options object stay live.

class DraggableStateImpl<T> implements DraggableEntityState<T> {
  element = $state.raw<HTMLElement | undefined>(undefined);
  handle = $state.raw<HTMLElement | undefined>(undefined);
  disabled = $state.raw(false);
  constructor(public options: DraggableOptions<T>) {
    this.disabled = options.disabled ?? false;
  }
}

class DroppableStateImpl<D> implements DroppableEntityState<D> {
  element = $state.raw<HTMLElement | undefined>(undefined);
  disabled = $state.raw(false);
  constructor(public options: DroppableOptions<D>) {
    this.disabled = options.disabled ?? false;
  }
}

export function createDraggable<T, Data = unknown>(
  dnd: Dnd<Data>,
  options: DraggableOptions<T>
): Draggable<T> {
  const state = new DraggableStateImpl<T>(options);
  return {
    id: options.id ?? generateId('g'),
    [OWNER]: { dnd },
    [STATE]: state,
  };
}

export function createDroppable<D extends Data, T extends D = D, Data = D>(
  dnd: Dnd<Data>,
  options: DroppableOptions<D, T> = {}
): Droppable<D> {
  const state = new DroppableStateImpl<D>(options);
  return {
    id: options.id ?? generateId('t'),
    [OWNER]: { dnd },
    [STATE]: state,
  };
}

export function drag<T>(draggable: Draggable<T>): Attachment<HTMLElement> {
  return (node) => {
    const state = draggable[STATE];
    state.element = node;
    draggable[OWNER].dnd[REGISTRY].addDraggable(draggable);
    return () => {
      if (state.element === node) {
        state.element = undefined;
      }
      draggable[OWNER].dnd[REGISTRY].removeDraggable(draggable);
    };
  };
}

export function dragHandle<T>(
  draggable: Draggable<T>
): Attachment<HTMLElement> {
  return (node) => {
    const state = draggable[STATE];
    state.handle = node;
    return () => {
      if (state.handle === node) {
        state.handle = undefined;
      }
    };
  };
}

export function drop<D>(droppable: Droppable<D>): Attachment<HTMLElement> {
  return (node) => {
    const state = droppable[STATE];
    state.element = node;
    droppable[OWNER].dnd[REGISTRY].addDroppable(droppable);
    return () => {
      if (state.element === node) {
        state.element = undefined;
      }
      droppable[OWNER].dnd[REGISTRY].removeDroppable(droppable);
    };
  };
}

// ── Entity accessors ──

export function isDragged(draggable: Draggable<unknown>): boolean {
  const dnd = draggable[OWNER].dnd;
  for (const op of dnd[ACTIONS].operations.values()) {
    if (op.sourceId === draggable.id) {
      return true;
    }
  }
  return false;
}

export function isOver(droppable: Droppable<unknown>): boolean {
  const dnd = droppable[OWNER].dnd;
  for (const op of dnd[ACTIONS].operations.values()) {
    if (op.targetId === droppable.id) {
      return true;
    }
  }
  return false;
}

export function element(
  entity?: Draggable<unknown> | Droppable<unknown>
): HTMLElement | undefined {
  return entity?.[STATE].element;
}

export function handle(
  draggable?: Draggable<unknown>
): HTMLElement | undefined {
  return draggable?.[STATE].handle;
}

export function data<T>(draggable?: Draggable<T>): T | undefined {
  return draggable?.[STATE].options.data?.();
}

// ── Disabled state (getter/setter functions) ──

export function isDisabled(
  entity?: Draggable<unknown> | Droppable<unknown>
): boolean {
  return entity?.[STATE].disabled ?? false;
}

export function setDisabled(
  entity: Draggable<unknown> | Droppable<unknown>,
  disabled: boolean
): void {
  entity[STATE].disabled = disabled;
}
