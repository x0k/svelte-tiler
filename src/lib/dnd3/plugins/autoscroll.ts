import { operations } from '../context.svelte.js';
import { subscribe } from '../context.svelte.js';
import type { DndPlugin } from '../model.js';

export interface AutoscrollOptions {
  edgeZone?: number;
  maxSpeed?: number;
}

function isScrollable(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return (
    (style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      style.overflowX === 'auto' ||
      style.overflowX === 'scroll') &&
    (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
  );
}

export function autoscroll(options: AutoscrollOptions = {}): DndPlugin {
  const edgeZone = options.edgeZone ?? 40;
  const maxSpeed = options.maxSpeed ?? 600;

  return (dnd) => {
    let raf = 0;
    let lastTime = 0;
    let running = false;

    const offStart = subscribe(dnd, 'start', () => {
      if (!running) {
        running = true;
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });

    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const ops = [...operations(dnd).values()];
      if (ops.length === 0) {
        running = false;
        return;
      }

      for (const op of ops) {
        const pointer = op.current;
        let node = document.elementFromPoint(pointer.x, pointer.y);
        while (node && node !== document.body) {
          if (node instanceof HTMLElement && isScrollable(node)) {
            scroll(node, dt, pointer);
          }
          node = node.parentElement;
        }
      }

      raf = requestAnimationFrame(tick);
    }

    function scroll(
      el: HTMLElement,
      dt: number,
      pointer: { x: number; y: number }
    ) {
      const rect = el.getBoundingClientRect();
      let dx = 0;
      let dy = 0;

      if (pointer.y < rect.top + edgeZone) {
        dy = -edgeFactor(pointer.y - rect.top) * maxSpeed * dt;
      } else if (pointer.y > rect.bottom - edgeZone) {
        dy = edgeFactor(rect.bottom - pointer.y) * maxSpeed * dt;
      }

      if (pointer.x < rect.left + edgeZone) {
        dx = -edgeFactor(pointer.x - rect.left) * maxSpeed * dt;
      } else if (pointer.x > rect.right - edgeZone) {
        dx = edgeFactor(rect.right - pointer.x) * maxSpeed * dt;
      }

      if (dx !== 0 || dy !== 0) {
        el.scrollLeft += dx;
        el.scrollTop += dy;
      }
    }

    function edgeFactor(distanceToEdge: number): number {
      return Math.max(0.15, 1 - Math.max(0, distanceToEdge) / edgeZone);
    }

    return () => {
      offStart();
      running = false;
      cancelAnimationFrame(raf);
    };
  };
}
