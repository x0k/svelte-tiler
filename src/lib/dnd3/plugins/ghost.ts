import { delta, source } from '../context.svelte.js';
import { element } from '../entities.svelte.js';
import { subscribe } from '../context.svelte.js';
import type { DndPlugin, Unsubscribe } from '../model.js';

export interface GhostPluginOptions {
  portalTo?: () => Element | null | undefined;
  class?: string | string[];
  zIndex?: number;
}

export function ghost(options: GhostPluginOptions = {}): DndPlugin {
  return (dnd) => {
    const clones = new Map<
      number,
      { clone: HTMLElement; offMove: Unsubscribe }
    >();

    const offStart = subscribe(dnd, 'start', ({ op }) => {
      const el = element(source(op));
      if (!el) {
        return;
      }
      const portal = options.portalTo?.() ?? document.body;

      const clone = el.cloneNode(true) as HTMLElement;
      const style = clone.style;
      style.position = 'fixed';
      style.left = '0';
      style.top = '0';
      style.margin = '0';
      style.width = `${op.shape.width}px`;
      style.height = `${op.shape.height}px`;
      style.pointerEvents = 'none';
      style.zIndex = String(options.zIndex ?? 9999);
      if (options.class) {
        clone.classList.add(...[options.class].flat());
      }
      portal.append(clone);

      const applyDelta = () => {
        const d = delta(op);
        style.transform = `translate3d(${op.shape.left + d.x}px, ${
          op.shape.top + d.y
        }px, 0)`;
      };
      applyDelta();

      const offMove = subscribe(dnd, 'move', (e) => {
        if (e.op === op) {
          applyDelta();
        }
      });
      clones.set(op.pointerId, { clone, offMove });
    });

    const offFinish = subscribe(dnd, 'finish', ({ op }) => {
      const entry = clones.get(op.pointerId);
      if (!entry) {
        return;
      }
      clones.delete(op.pointerId);
      entry.offMove();
      entry.clone.remove();
    });

    return () => {
      offStart();
      offFinish();
      for (const entry of clones.values()) {
        entry.offMove();
        entry.clone.remove();
      }
      clones.clear();
    };
  };
}
