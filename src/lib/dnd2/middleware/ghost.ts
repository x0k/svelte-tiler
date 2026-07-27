import type { DndInstance } from '../types.ts';
import type { DndPlugin } from '../core.ts';

export interface GhostOptions {
  /** Opacity of the ghost element (0-1). @default 0.85 */
  opacity?: number;
  /** CSS class to add to the ghost element */
  className?: string;
  /** Whether to clone the element (true) or move it (false). @default true */
  clone?: boolean;
}

/**
 * Ghost plugin — renders a floating drag preview that follows the cursor.
 *
 * Usage:
 *   const dnd = createDnd({ plugins: [ghost({ opacity: 0.8 })] })
 */
export function ghost(
  options: GhostOptions = {}
): (instance: DndInstance) => DndPlugin {
  const { opacity = 0.85, className, clone: shouldClone = true } = options;
  let ghostEl: HTMLElement | null = null;
  let offsetX = 0;
  let offsetY = 0;

  function createGhost(source: HTMLElement, e: PointerEvent) {
    const rect = source.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    if (shouldClone) {
      ghostEl = source.cloneNode(true) as HTMLElement;
    } else {
      ghostEl = source;
    }

    Object.assign(ghostEl.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: 'none',
      zIndex: '9999',
      opacity: String(opacity),
      transform: `translate3d(${e.clientX - offsetX}px, ${e.clientY - offsetY}px, 0)`,
    });

    if (className) {
      ghostEl.classList.add(className);
    }

    if (shouldClone) {
      document.body.appendChild(ghostEl);
    }
  }

  function removeGhost() {
    if (ghostEl && shouldClone) {
      ghostEl.remove();
    }
    ghostEl = null;
  }

  return (_instance: DndInstance): DndPlugin => ({
    onDragStart(e, draggable) {
      createGhost(draggable.element, e);
    },

    onMove(e: PointerEvent) {
      if (!ghostEl) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      ghostEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },

    onDragEnd() {
      removeGhost();
    },
  });
}
