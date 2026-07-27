import type { DndInstance } from '../types.ts';
import type { DndPlugin } from '../core.ts';

export interface AutoscrollOptions {
  /** Scrollable containers to manage. If omitted, auto-discovers from DOM. */
  scrollables?: Iterable<HTMLElement>;
  /** Edge zone size as fraction (< 1) or pixels (>= 1). @default 0.15 */
  zone?: number;
  /** Maximum scroll speed in px/frame at the very edge. @default 20 */
  maxSpeed?: number;
  /** Whether to also scroll the viewport. @default true */
  scrollViewport?: boolean;
}

function easeOut(t: number): number {
  return t * t;
}

function edgeSpeed(
  pointer: number,
  start: number,
  end: number,
  zone: number,
  maxSpeed: number
): number {
  const dim = end - start;
  const z = zone < 1 ? dim * zone : zone;

  if (pointer < start + z) {
    const t = 1 - (pointer - start) / z;
    return -Math.round(easeOut(t) * maxSpeed);
  }
  if (pointer > end - z) {
    const t = 1 - (end - pointer) / z;
    return Math.round(easeOut(t) * maxSpeed);
  }
  return 0;
}

function isScrollable(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const overflowY = style.overflowY;
  const overflowX = style.overflowX;
  return (
    ((overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight) ||
    ((overflowX === 'auto' || overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth)
  );
}

function findScrollables(element: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== document.documentElement) {
    if (isScrollable(current)) {
      result.push(current);
    }
    current = current.parentElement;
  }
  return result;
}

function compareByDepth(a: HTMLElement, b: HTMLElement): number {
  const rel = a.compareDocumentPosition(b);
  if (rel & Node.DOCUMENT_POSITION_CONTAINS) return 1;
  if (rel & Node.DOCUMENT_POSITION_CONTAINED_BY) return -1;
  return 0;
}

/**
 * Autoscroll plugin — scrolls containers near edges during drag.
 *
 * Usage:
 *   const dnd = createDnd({ plugins: [autoscroll({
 *     zone: 0.15,
 *     maxSpeed: 20,
 *   })] })
 */
export function autoscroll(
  options: AutoscrollOptions = {}
): (instance: DndInstance) => DndPlugin {
  const { zone = 0.15, maxSpeed = 20, scrollViewport = true } = options;

  let rafId: number | undefined;
  let px = 0;
  let py = 0;
  let candidates: HTMLElement[] = [];

  function tick() {
    for (const el of candidates) {
      const rect =
        el === document.documentElement
          ? {
              left: 0,
              top: 0,
              right: window.innerWidth,
              bottom: window.innerHeight,
            }
          : el.getBoundingClientRect();

      if (
        px < rect.left ||
        px > rect.right ||
        py < rect.top ||
        py > rect.bottom
      ) {
        continue;
      }

      const dx = edgeSpeed(px, rect.left, rect.right, zone, maxSpeed);
      const dy = edgeSpeed(py, rect.top, rect.bottom, zone, maxSpeed);

      if (dx !== 0 || dy !== 0) {
        el.scrollBy({ left: dx, top: dy });
        break;
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (rafId !== undefined) return;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }
    candidates = [];
  }

  return (_instance: DndInstance): DndPlugin => ({
    onDragStart(e, draggable) {
      if (options.scrollables) {
        candidates = [...options.scrollables].sort(compareByDepth);
      } else {
        candidates = findScrollables(draggable.element).sort(compareByDepth);
      }
      if (scrollViewport) {
        candidates.push(document.documentElement);
      }
      px = e.clientX;
      py = e.clientY;
      start();
    },

    onMove(e: PointerEvent) {
      px = e.clientX;
      py = e.clientY;
    },

    onDragEnd() {
      stop();
    },
  });
}
