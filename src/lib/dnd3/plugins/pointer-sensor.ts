import { ACTIONS, REGISTRY, STATE } from '../model.js';
import { element, handle } from '../entities.svelte.js';
import type { DndPlugin, Draggable, Unsubscribe } from '../model.js';

export interface PointerSensorOptions {
  threshold?: number;
  interactive?: string[];
}

const DEFAULT_INTERACTIVE = [
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'a[href]',
  'label',
  '[contenteditable]',
];

const INPUT_SELECTORS = [
  'input',
  'textarea',
  'select',
  'option',
  '[contenteditable]',
];

export function pointerSensor(options: PointerSensorOptions = {}): DndPlugin {
  const thresholdSq = (options.threshold ?? 4) ** 2;
  const interactive = options.interactive ?? DEFAULT_INTERACTIVE;

  return (dnd): Unsubscribe => {
    const bound = new Map<string, () => void>();
    const activePointers = new Map<string, number>();
    const activeDrags = new Set<() => void>();

    function onPointerDown(draggable: Draggable<unknown>, e: PointerEvent) {
      if (e.button !== 0 || !e.isPrimary || draggable[STATE].disabled) {
        return;
      }

      const el = element(draggable);
      if (!el) {
        return;
      }
      if (activePointers.has(draggable.id)) {
        return;
      }

      const target = e.target;
      if (
        target instanceof Element &&
        INPUT_SELECTORS.some((selector) => target.closest(selector))
      ) {
        return;
      }
      const handleEl = handle(draggable);
      if (handleEl) {
        if (!(target instanceof Node && handleEl.contains(target))) {
          return;
        }
      } else if (
        target instanceof Element &&
        interactive.some((selector) => target.closest(selector))
      ) {
        return;
      }

      e.preventDefault();

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic events in tests may reference unknown pointers.
      }

      activePointers.set(draggable.id, e.pointerId);

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      let started = false;

      const controller = new AbortController();
      const cleanup = () => {
        activeDrags.delete(cleanup);
        controller.abort();
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          // Pointer capture may already be released.
        }
        if (activePointers.get(draggable.id) === pointerId) {
          activePointers.delete(draggable.id);
        }
      };
      activeDrags.add(cleanup);

      const activate = (e: PointerEvent) => {
        started = true;
        const rect = el.getBoundingClientRect();
        dnd[ACTIONS].start({
          pointerId,
          sourceId: draggable.id,
          point: { x: e.clientX, y: e.clientY },
          shape: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
        });
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) {
          return;
        }
        if (!started) {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          if (dx * dx + dy * dy < thresholdSq) {
            return;
          }
          activate(e);
        }
        dnd[ACTIONS].move(pointerId, { x: e.clientX, y: e.clientY }, e);
      };

      const finish = (canceled: boolean, event?: Event) => {
        cleanup();
        if (started) {
          dnd[ACTIONS].stop(pointerId, { canceled, event });
          suppressClick();
        }
      };

      const onUp = (e: PointerEvent) => {
        if (e.pointerId === pointerId) {
          finish(false, e);
        }
      };

      const onCancel = (e: PointerEvent) => {
        if (e.pointerId === pointerId) {
          finish(true, e);
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          finish(true);
        }
      };

      const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        finish(true, e);
      };

      window.addEventListener('pointermove', onMove, {
        signal: controller.signal,
      });
      window.addEventListener('pointerup', onUp, {
        signal: controller.signal,
      });
      window.addEventListener('pointercancel', onCancel, {
        signal: controller.signal,
      });
      window.addEventListener('keydown', onKeyDown, {
        signal: controller.signal,
      });
      window.addEventListener('contextmenu', onContextMenu, {
        signal: controller.signal,
      });
    }

    function bind(draggable: Draggable<unknown>) {
      const el = element(draggable);
      if (!el || bound.has(draggable.id)) {
        return;
      }
      const gestureTarget = handle(draggable) ?? el;
      const previousTouchAction = gestureTarget.style.touchAction;
      gestureTarget.style.touchAction = 'none';
      const listener = (e: PointerEvent) => onPointerDown(draggable, e);
      el.addEventListener('pointerdown', listener);
      bound.set(draggable.id, () => {
        el.removeEventListener('pointerdown', listener);
        gestureTarget.style.touchAction = previousTouchAction;
      });
    }

    function unbind(id: string) {
      const cleanup = bound.get(id);
      if (!cleanup) {
        return;
      }
      bound.delete(id);
      cleanup();
    }

    const unsubRegistry = dnd[REGISTRY].subscribe((event) => {
      if (event.type !== 'draggable') {
        return;
      }
      if (event.added) {
        bind(event.entity);
      } else {
        unbind(event.entity.id);
      }
    });

    return () => {
      unsubRegistry();
      for (const cleanup of activeDrags) {
        cleanup();
      }
      activeDrags.clear();
      for (const cleanup of bound.values()) {
        cleanup();
      }
      bound.clear();
    };
  };
}

function suppressClick() {
  window.addEventListener(
    'click',
    (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    },
    { once: true, capture: true }
  );
}
