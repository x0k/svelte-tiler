import type {
  Attachment,
  DndInstance,
  DraggableOptions,
  DroppableOptions,
  DropPosition,
  DragPhase,
  StopEvent,
} from './types.ts';

// ── Constants ──

const DRAG_THRESHOLD = 5;
const INTERACTIVE_SELECTORS = [
  'input',
  'textarea',
  'select',
  'button',
  '[contenteditable]',
  'a[href]',
  'label',
  'option',
];

// ── Internal types ──

interface DraggableEntry {
  data: unknown;
  options: DraggableOptions;
  element: HTMLElement;
  handleElement: HTMLElement | undefined;
}

interface DroppableEntry {
  options: DroppableOptions;
  element: HTMLElement;
  isOver: boolean;
}

export interface DndPlugin {
  onDragStart?: (e: PointerEvent, draggable: DraggableEntry) => void;
  onMove?: (e: PointerEvent) => void;
  onDragEnd?: (e: StopEvent, draggable: DraggableEntry) => void;
}

// ── Helpers ──

function isInteractiveElement(target: HTMLElement): boolean {
  return INTERACTIVE_SELECTORS.some(
    (s) => target.matches(s) || target.closest(s)
  );
}

function getDropPosition(
  clientY: number,
  clientX: number,
  rect: DOMRect,
  direction: 'vertical' | 'horizontal' | 'grid'
): DropPosition {
  if (direction === 'horizontal') {
    return clientX < rect.left + rect.width / 2 ? 'before' : 'after';
  }
  if (direction === 'grid') {
    const nx = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    return Math.abs(ny) >= Math.abs(nx)
      ? ny < 0
        ? 'before'
        : 'after'
      : nx < 0
        ? 'before'
        : 'after';
  }
  return clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

// ── Factory ──

export type PluginFactory = (instance: DndInstance) => DndPlugin;

export interface CreateDndOptions {
  plugins?: PluginFactory[];
}

export function createDnd(options: CreateDndOptions = {}): DndInstance {
  const draggables = new Map<HTMLElement, DraggableEntry>();
  const droppables = new Map<string, DroppableEntry>();
  const translations = new Map<string, { x: number; y: number }>();

  const plugins: DndPlugin[] = [];

  let currentDraggable: DraggableEntry | null = null;
  let activeDroppable: DroppableEntry | null = null;
  let controller: AbortController | null = null;
  let dragOffsetX: number | null = null;
  let dragOffsetY: number | null = null;

  // ── Reactive state (scoped to this instance) ──

  let phase: DragPhase = $state('idle');
  let dragItem: unknown = $state(null);
  let ghostX = $state(0);
  let ghostY = $state(0);
  let ghostWidth = $state(0);
  let ghostHeight = $state(0);
  let sourceContainer: string | null = $state(null);
  let targetContainer: string | null = $state(null);

  function reset() {
    phase = 'idle';
    dragItem = null;
    ghostX = 0;
    ghostY = 0;
    ghostWidth = 0;
    ghostHeight = 0;
    sourceContainer = null;
    targetContainer = null;
    translations.clear();
  }

  function findDroppableAt(x: number, y: number): DroppableEntry | undefined {
    for (const entry of droppables.values()) {
      if (entry.options.disabled) continue;
      const rect = entry.element.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        if (!entry.options.accepts || entry.options.accepts(dragItem)) {
          return entry;
        }
      }
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!currentDraggable) return;

    // Pending → Dragging threshold check
    if (phase === 'pending') {
      const dx = e.clientX - ghostX;
      const dy = e.clientY - ghostY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;

      phase = 'dragging';
      currentDraggable.options.onDragStart?.(e, currentDraggable.data as never);
      for (const hooks of plugins) {
        hooks.onDragStart?.(e, currentDraggable);
      }
    }

    // Update ghost position
    const el = currentDraggable.element;
    const rect = el.getBoundingClientRect();
    ghostX = e.clientX - (dragOffsetX ?? e.clientX - rect.left);
    ghostY = e.clientY - (dragOffsetY ?? e.clientY - rect.top);

    // Notify draggable
    currentDraggable.options.onDrag?.(e, currentDraggable.data as never);

    // Find drop target
    const target = findDroppableAt(e.clientX, e.clientY);

    if (activeDroppable !== target) {
      activeDroppable?.options.onDragLeave?.();
      if (activeDroppable) activeDroppable.isOver = false;
      target?.options.onDragEnter?.(target.options as never, target.element);
      if (target) target.isOver = true;
      activeDroppable = target ?? null;
      targetContainer = target?.options.container ?? null;
    }

    if (activeDroppable) {
      const rect2 = activeDroppable.element.getBoundingClientRect();
      const position = getDropPosition(
        e.clientY,
        e.clientX,
        rect2,
        activeDroppable.options.direction ?? 'vertical'
      );
      activeDroppable.options.onDragOver?.(
        activeDroppable.options as never,
        position
      );
    }

    // Notify plugins
    for (const hooks of plugins) {
      hooks.onMove?.(e);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (!currentDraggable) return;

    controller?.abort();
    controller = null;

    if (phase === 'dragging') {
      const stopEvent: StopEvent = {
        reason: activeDroppable ? 'drop' : 'cancel',
        data: $state.snapshot(currentDraggable.data),
      };

      activeDroppable?.options.onDragLeave?.();
      if (activeDroppable) {
        activeDroppable.isOver = false;
      }

      currentDraggable.options.onDragEnd?.(
        stopEvent,
        currentDraggable.data as never
      );

      for (const hooks of plugins) {
        hooks.onDragEnd?.(stopEvent, currentDraggable);
      }

      if (stopEvent.reason === 'drop' && activeDroppable) {
        const target = findDroppableAt(e.clientX, e.clientY);
        if (target) {
          const rect = target.element.getBoundingClientRect();
          const position = getDropPosition(
            e.clientY,
            e.clientX,
            rect,
            target.options.direction ?? 'vertical'
          );
          target.options.onDrop?.(target.options as never, position);
        }
      }

      // Prevent click after drag
      const clickHandler = (ev: Event) => {
        ev.stopImmediatePropagation();
        ev.preventDefault();
      };
      currentDraggable.element.addEventListener('click', clickHandler, {
        once: true,
        capture: true,
      });
    }

    activeDroppable = null;
    targetContainer = null;
    reset();
    currentDraggable = null;
    dragOffsetX = null;
    dragOffsetY = null;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && currentDraggable) {
      handlePointerUp(new PointerEvent('pointerup', { bubbles: false }));
    }
  }

  // ── Instance ──

  const instance: DndInstance = {
    get phase() {
      return phase;
    },
    get item() {
      return dragItem;
    },
    get ghostX() {
      return ghostX;
    },
    get ghostY() {
      return ghostY;
    },
    get ghostWidth() {
      return ghostWidth;
    },
    get ghostHeight() {
      return ghostHeight;
    },
    get sourceContainer() {
      return sourceContainer;
    },
    get targetContainer() {
      return targetContainer;
    },
    get translations() {
      return translations;
    },

    draggable<T>(options: DraggableOptions<T>): Attachment<HTMLElement> {
      return (node: HTMLElement) => {
        let handleEl: HTMLElement | undefined;
        if (options.handle) {
          if (typeof options.handle === 'string') {
            handleEl = node.querySelector(options.handle) as HTMLElement;
          } else {
            handleEl = options.handle;
          }
        }

        const entry: DraggableEntry = {
          data: options.data,
          options: options as DraggableOptions,
          element: node,
          handleElement: handleEl,
        };
        draggables.set(node, entry);

        const ctrl = new AbortController();
        const signal = ctrl.signal;

        const onPointerDown = (e: PointerEvent) => {
          if (e.button !== 0 || !e.isPrimary || options.disabled) return;

          // Check interactive elements
          const target = e.target as HTMLElement;
          if (!handleEl && isInteractiveElement(target)) return;

          // Check handle
          if (handleEl) {
            if (!handleEl.contains(target) && target !== handleEl) return;
          }

          e.preventDefault();

          const rect = node.getBoundingClientRect();
          dragOffsetX = e.clientX - rect.left;
          dragOffsetY = e.clientY - rect.top;

          phase = 'pending';
          dragItem = options.data;
          ghostX = e.clientX - dragOffsetX;
          ghostY = e.clientY - dragOffsetY;
          ghostWidth = rect.width;
          ghostHeight = rect.height;
          sourceContainer = null;

          currentDraggable = entry;

          controller = new AbortController();
          window.addEventListener('pointermove', handlePointerMove, {
            signal: controller.signal,
          });
          window.addEventListener('pointerup', handlePointerUp, {
            signal: controller.signal,
          });
          window.addEventListener('keydown', handleKeyDown, {
            signal: controller.signal,
          });
        };

        node.addEventListener('pointerdown', onPointerDown, { signal });

        return () => {
          ctrl.abort();
          draggables.delete(node);
        };
      };
    },

    dropzone<D>(options: DroppableOptions<D>): Attachment<HTMLElement> {
      return (node: HTMLElement) => {
        const entry: DroppableEntry = {
          options: options as DroppableOptions,
          element: node,
          isOver: false,
        };
        droppables.set(options.container, entry);

        return () => {
          droppables.delete(options.container);
        };
      };
    },
  };

  for (const f of options.plugins ?? []) {
    plugins.push(f(instance));
  }

  return instance;
}
