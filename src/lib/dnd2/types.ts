// ── Event types ──

/** Svelte 5 attachment function type for use with {@attach} */
export type Attachment<T = HTMLElement> = (node: T) => void | (() => void);

export type StopReason = 'drop' | 'cancel';

export interface StopEvent {
  reason: StopReason;
  /** The data from the dragged item, snapshotted at drop time */
  data: unknown;
}

// ── Draggable options ──

export interface DraggableOptions<T = unknown> {
  /** Data associated with this draggable item */
  data: T;
  /** CSS selector for the drag handle element, or HTMLElement */
  handle?: string | HTMLElement;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Called when drag starts (after threshold is met) */
  onDragStart?: (e: PointerEvent, data: T) => void;
  /** Called on every pointermove during drag */
  onDrag?: (e: PointerEvent, data: T) => void;
  /** Called when drag ends */
  onDragEnd?: (e: StopEvent, data: T) => void;
}

// ── Droppable options ──

export type DropPosition = 'before' | 'after';

export interface DroppableOptions<D = unknown> {
  /** Container identifier for grouping droppables */
  container: string;
  /** Layout direction for drop position calculation */
  direction?: 'vertical' | 'horizontal' | 'grid';
  /** Whether this droppable is disabled */
  disabled?: boolean;
  /** Whether this droppable accepts the dragged item */
  accepts?: (data: D) => boolean;
  /** Called when a draggable enters this drop zone */
  onDragEnter?: (data: D, element: HTMLElement) => void;
  /** Called while a draggable hovers over this drop zone */
  onDragOver?: (data: D, position: DropPosition) => void;
  /** Called when a draggable leaves this drop zone */
  onDragLeave?: () => void;
  /** Called when a drop occurs on this zone */
  onDrop?: (data: D, position: DropPosition) => void;
}

// ── Sortable options ──

export interface SortableOptions {
  /** Container identifier (same as droppable container) */
  container: string;
  /** Item index in the list */
  index: number;
  /** Layout direction */
  direction?: 'vertical' | 'horizontal';
  /** Spacing between items in px (used for translation step) */
  spacing?: number;
}

// ── Middleware types ──

export type DragPhase = 'idle' | 'pending' | 'dragging';

export interface DndInstance {
  /** Current drag phase */
  readonly phase: DragPhase;
  /** Data of the currently dragged item */
  readonly item: unknown;
  /** Ghost element X position */
  readonly ghostX: number;
  /** Ghost element Y position */
  readonly ghostY: number;
  /** Ghost element width (snapshot at drag start) */
  readonly ghostWidth: number;
  /** Ghost element height (snapshot at drag start) */
  readonly ghostHeight: number;
  /** Source container ID */
  readonly sourceContainer: string | null;
  /** Target container ID (the droppable the pointer is over) */
  readonly targetContainer: string | null;
  /** Translations map: slotId -> {x, y} offset for sortable reordering */
  readonly translations: Map<string, { x: number; y: number }>;

  draggable: <T>(options: DraggableOptions<T>) => Attachment<HTMLElement>;
  dropzone: <D>(options: DroppableOptions<D>) => Attachment<HTMLElement>;
}

// ── Sortable zone types ──

export interface SortableSlot {
  id: string;
  index: number;
  element: HTMLElement;
  rect: DOMRect;
}

export interface SortableContainer {
  id: string;
  element: HTMLElement;
  slots: SortableSlot[];
  direction: 'vertical' | 'horizontal';
  spacing: number;
}
