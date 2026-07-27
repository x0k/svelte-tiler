import type { DndInstance, SortableContainer, SortableSlot } from '../types.ts';
import type { DndPlugin } from '../core.ts';

export interface SortableConfig {
  direction?: 'vertical' | 'horizontal';
  spacing?: number;
}

export interface SortableExt {
  /** Register a sortable container. Use as: {@attach dnd.registerContainer('list')} */
  registerContainer: (
    id: string,
    config?: SortableConfig
  ) => (node: HTMLElement) => () => void;
}

function captureSnapshot(container: SortableContainer) {
  const containerRect = container.element.getBoundingClientRect();
  const slots: SortableSlot[] = [];
  for (const child of container.element.children) {
    const el = child as HTMLElement;
    const slotId = el.dataset?.dndSlotId;
    if (!slotId) continue;
    const rect = el.getBoundingClientRect();
    slots.push({
      id: slotId,
      index: slots.length,
      element: el,
      rect: {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      } as DOMRect,
    });
  }
  container.slots = slots;
}

function computeTranslations(
  container: SortableContainer,
  targetIndex: number,
  draggedIndex: number,
  translations: Map<string, { x: number; y: number }>
) {
  const axis = container.direction === 'horizontal' ? 'x' : 'y';
  const step =
    axis === 'y'
      ? (container.slots[0]?.rect.height ?? 0) + container.spacing
      : (container.slots[0]?.rect.width ?? 0) + container.spacing;

  if (step === 0) return;

  for (const slot of container.slots) {
    if (slot.index === draggedIndex) continue;

    let delta = 0;
    if (draggedIndex < targetIndex) {
      if (slot.index > draggedIndex && slot.index < targetIndex) {
        delta = -step;
      }
    } else if (draggedIndex > targetIndex) {
      if (slot.index >= targetIndex && slot.index < draggedIndex) {
        delta = step;
      }
    }

    if (delta !== 0) {
      translations.set(slot.id, {
        x: axis === 'x' ? delta : 0,
        y: axis === 'y' ? delta : 0,
      });
    } else {
      translations.delete(slot.id);
    }
  }
}

function getTargetIndex(
  container: SortableContainer,
  clientY: number,
  clientX: number
): number {
  for (const slot of container.slots) {
    const rect = slot.element.getBoundingClientRect();
    const isOver =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (isOver) {
      const midpoint =
        container.direction === 'horizontal'
          ? rect.left + rect.width / 2
          : rect.top + rect.height / 2;
      const cursor = container.direction === 'horizontal' ? clientX : clientY;
      return cursor < midpoint ? slot.index : slot.index + 1;
    }
  }
  return container.slots.length;
}

/**
 * Sortable plugin — computes CSS translate offsets for sibling reordering.
 *
 * Usage:
 *   const dnd = createDnd({ plugins: [sortable()] })
 *
 * Register containers via the extension:
 *   <div {@attach dnd.registerContainer('list', { direction: 'vertical' })}>
 *
 * Apply translations:
 *   <div style="transform: translate({dnd.translations.get(id)?.x ?? 0}px, ...)">
 */
export function sortable(
  _config: SortableConfig = {}
): (instance: DndInstance) => DndPlugin {
  const containers = new Map<string, SortableContainer>();
  let draggedIndex = -1;

  function registerContainer(id: string, config: SortableConfig = {}) {
    return (node: HTMLElement) => {
      const container: SortableContainer = {
        id,
        element: node,
        slots: [],
        direction: config.direction ?? 'vertical',
        spacing: config.spacing ?? 0,
      };
      containers.set(id, container);

      return () => {
        containers.delete(id);
      };
    };
  }

  return (instance: DndInstance): DndPlugin => {
    (instance as DndInstance & SortableExt).registerContainer =
      registerContainer;

    return {
      onDragStart(_e, draggable) {
        const containerEl = draggable.element.closest(
          '[data-dnd-container]'
        ) as HTMLElement | null;
        if (!containerEl) return;
        const containerId = containerEl.dataset.dndContainer;
        if (!containerId) return;
        const container = containers.get(containerId);
        if (!container) return;

        captureSnapshot(container);
        draggedIndex = container.slots.findIndex(
          (s) => s.element === draggable.element
        );
      },

      onMove(e: PointerEvent) {
        for (const container of containers.values()) {
          const containerRect = container.element.getBoundingClientRect();
          const isOverContainer =
            e.clientX >= containerRect.left &&
            e.clientX <= containerRect.right &&
            e.clientY >= containerRect.top &&
            e.clientY <= containerRect.bottom;

          if (!isOverContainer) continue;

          const targetIndex = getTargetIndex(container, e.clientY, e.clientX);
          computeTranslations(
            container,
            targetIndex,
            draggedIndex,
            instance.translations
          );
        }
      },

      onDragEnd() {
        instance.translations.clear();
        draggedIndex = -1;
      },
    };
  };
}
