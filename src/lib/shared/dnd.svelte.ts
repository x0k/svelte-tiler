import { flushSync } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

import type { MutableRegistry } from './registry.ts';

export interface DndPlugin<T> {
  onStart(e: PointerEvent, draggable: Draggable<T>): void;
  onMove(e: PointerEvent): void;
  onStop(e: StopEvent): void;
}

export interface DndContextOptions<T> {
  plugins?: DndPlugin<T>[];
}

export interface Draggable<T = unknown> extends DndPlugin<T> {
  id: string;
  element: HTMLElement;
  handle: HTMLElement | undefined;
  data: T | undefined;
}

export interface Droppable<D = unknown, T extends D = D> {
  id: string;
  element: HTMLElement;
  accepts(draggable: Draggable<D>): draggable is Draggable<T>;
  onEnter(): void;
  onMove(e: PointerEvent): void;
  onLeave(): void;
  onDrop(data: T, draggable: Draggable<T>): void;
}

export class DndContext<D = unknown> {
  #didDrag = false;
  #droppables = new SvelteMap<string, Droppable<D, any>>();
  #plugins: DndPlugin<D>[];

  sourceId: string | undefined = $state.raw();
  targetId: string | undefined = $state.raw();

  constructor({ plugins = [] }: DndContextOptions<D> = {}) {
    this.#plugins = plugins;
  }

  get droppables(): MutableRegistry<string, Droppable<D, any> | undefined> {
    return this.#droppables;
  }

  beginDrag(draggable: Draggable<D>, event: PointerEvent) {
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      event.composedPath().some((n) => n instanceof HTMLButtonElement)
    ) {
      return;
    }

    const el = draggable.element;

    el.setPointerCapture(event.pointerId);

    const abortController = new AbortController();

    const plugins: DndPlugin<D>[] = [draggable, ...this.#plugins];
    let activeDroppable: Droppable<D, any> | undefined;
    const handleMove = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) {
        return;
      }

      if (!this.#didDrag) {
        const dx = e.clientX - event.clientX;
        const dy = e.clientY - event.clientY;
        if (dx * dx + dy * dy < 16) {
          return;
        }
        this.#didDrag = true;
        this.sourceId = draggable.id;

        for (const p of plugins) {
          p.onStart(e, draggable);
        }
      }

      for (const p of plugins) {
        p.onMove(e);
      }

      const nextDroppable = this.findDroppable(e.clientX, e.clientY, draggable);
      if (activeDroppable !== nextDroppable) {
        activeDroppable?.onLeave();
        nextDroppable?.onEnter();
        activeDroppable = nextDroppable;
        this.targetId = activeDroppable?.id;
      }
      activeDroppable?.onMove(e);
    };

    const handleStop = (ev: StopEvent) => {
      el.releasePointerCapture(event.pointerId);
      abortController.abort();

      if (!this.#didDrag) {
        return;
      }

      const snap =
        ev.reason === 'drop' ? $state.snapshot(draggable.data) : undefined;
      activeDroppable?.onLeave();

      for (const p of plugins) {
        p.onStop(ev);
      }

      if (ev.reason === 'drop') {
        flushSync(() => {
          activeDroppable?.onDrop(snap, draggable);
        });
      }

      this.targetId = undefined;
      this.sourceId = undefined;
      setTimeout(() => {
        this.#didDrag = false;
      });
    };

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleStop({ reason: 'cancel' });
      }
    }

    window.addEventListener('pointermove', handleMove, abortController);
    window.addEventListener(
      'pointerup',
      (e) => {
        if (e.pointerId !== event.pointerId) {
          return;
        }
        handleStop({
          reason: activeDroppable === undefined ? 'cancel' : 'drop',
        });
      },
      abortController
    );
    window.addEventListener('keydown', onKeydown, abortController);
    window.addEventListener(
      'contextmenu',
      () => handleStop({ reason: 'cancel' }),
      abortController
    );
  }

  preventClick(e: PointerEvent) {
    if (!this.#didDrag) {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    this.#didDrag = false;
  }

  protected findDroppable(
    x: number,
    y: number,
    draggable: Draggable<D>
  ): Droppable<D, any> | undefined {
    for (const d of this.#droppables.values()) {
      if (d.element === undefined) {
        continue;
      }
      const r = d.element.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
        continue;
      }
      if (d.accepts(draggable)) {
        return d;
      }
    }
  }
}

export type StopReason = 'drop' | 'cancel';

export interface StopEvent {
  reason: StopReason;
}

export interface DragSourceOptions<D> {
  data?: D;
}

export class DragSource<D = unknown> implements Draggable<D> {
  #abortController = new AbortController();
  #baseElement: HTMLElement | undefined;
  #handleElement: HTMLElement | undefined;

  readonly id = crypto.randomUUID();

  constructor(
    protected readonly ctx: DndContext<D>,
    protected readonly options: DragSourceOptions<D> = {}
  ) {
    this.register = this.register.bind(this);
    this.registerHandle = this.registerHandle.bind(this);
  }

  get element() {
    return this.#baseElement!;
  }

  get handle() {
    return this.#handleElement;
  }

  get isDragged() {
    return this.ctx.sourceId === this.id;
  }

  get data() {
    return this.options.data;
  }

  register(el: HTMLElement) {
    if (!this.#handleElement) {
      this[Symbol.dispose]();
      this.addEventHandlers(el);
    }
    this.#baseElement = el;
    return () => {
      this.#baseElement = undefined;
      if (!this.#handleElement) {
        this[Symbol.dispose]();
      }
    };
  }

  registerHandle(el: HTMLElement) {
    this[Symbol.dispose]();
    this.addEventHandlers(el);
    this.#handleElement = el;
    return () => {
      this.#handleElement = undefined;
      this[Symbol.dispose]();
    };
  }

  [Symbol.dispose]() {
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }

  onStart(_e: PointerEvent, _draggable: Draggable<D>) {}

  onMove(_e: PointerEvent) {}

  onStop(_e: StopEvent) {}

  protected addEventHandlers(el: HTMLElement) {
    el.addEventListener(
      'pointerdown',
      (e) => this.ctx.beginDrag(this, e),
      this.#abortController
    );
    el.addEventListener('click', (e) => this.ctx.preventClick(e), {
      capture: true,
      signal: this.#abortController.signal,
    });
  }
}

export class DropTarget<D = unknown, T extends D = D> implements Droppable<
  D,
  T
> {
  #element: HTMLElement | undefined = $state.raw();

  readonly id = crypto.randomUUID();

  constructor(protected readonly ctx: DndContext<D>) {
    this.register = this.register.bind(this);
  }

  get element() {
    return this.#element!;
  }

  get isOver() {
    return this.ctx.targetId === this.id;
  }

  [Symbol.dispose]() {
    this.#element = undefined;
    this.ctx.droppables.delete(this.id);
  }

  register(el: HTMLElement) {
    this[Symbol.dispose]();
    this.ctx.droppables.set(this.id, this);
    this.#element = el;
    return () => {
      this[Symbol.dispose]();
    };
  }

  accepts(draggable: DragSource<D>): draggable is DragSource<T> {
    return true;
  }

  onEnter() {}

  onMove(_e: PointerEvent) {}

  onLeave() {}

  onDrop(_data: T, _draggable: Draggable<T>) {}
}

export interface ClonedGhostOptions {
  container: ShadowRoot | Document | Node;
}
interface ClonedGhostState {
  element: HTMLElement;
  offsetX: number;
  offsetY: number;
}

export class ClonedGhost {
  #options: ClonedGhostOptions;
  #state: ClonedGhostState = {} as ClonedGhostState;

  constructor(options: ClonedGhostOptions) {
    this.#options = options;
  }

  onStart(e: PointerEvent, draggable: Draggable<any>) {
    const el = draggable.element;
    const rect = el.getBoundingClientRect();
    const element = el.cloneNode(true) as HTMLElement;
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    this.#state = {
      element,
      offsetX,
      offsetY,
    };
    Object.assign(element.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: 'none',
      zIndex: '9999',
      opacity: '0.85',
    });
    this.#options.container.appendChild(element);
  }

  onMove(e: PointerEvent) {
    const x = e.clientX - this.#state.offsetX;
    const y = e.clientY - this.#state.offsetY;
    this.#state.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  onStop() {
    this.#state.element.remove();
  }
}

export interface AutoScrollOptions {
  scrollables: Iterable<HTMLElement>;
  /**
   * Size of the trigger zone near each edge.
   * A value < 1 is treated as a fraction of the container dimension,
   * a value ≥ 1 is treated as absolute pixels.
   * @default 0.15
   */
  zone?: number;
  /** Maximum scroll speed in px/frame at the very edge. @default 20 */
  maxSpeed?: number;
}

/** t=0 at zone boundary (slow), t=1 at edge (fast). */
function easeOut(t: number): number {
  return t * t;
}

/**
 * Returns the scroll delta for one axis.
 * Speed ramps from 0 at the zone boundary to maxSpeed at the very edge,
 * using an ease-out curve (slow on entry, fast when pressed against the edge).
 */
function edgeSpeed(
  pointer: number,
  start: number,
  end: number,
  zone: number | undefined,
  maxSpeed: number
): number {
  const dim = end - start;
  const z = zone === undefined ? dim * 0.15 : zone < 1 ? dim * zone : zone;

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

function compareByDepth(a: HTMLElement, b: HTMLElement): number {
  const rel = a.compareDocumentPosition(b);
  if (rel & Node.DOCUMENT_POSITION_CONTAINS) return 1;
  if (rel & Node.DOCUMENT_POSITION_CONTAINED_BY) return -1;
  return 0;
}

export class SimpleAutoScroller implements DndPlugin<any> {
  #options: AutoScrollOptions;
  #rafId: number | undefined;
  #px = 0;
  #py = 0;
  #candidates: HTMLElement[] = [];

  constructor(options: AutoScrollOptions) {
    this.#options = options;
  }

  onStart(e: PointerEvent) {
    this.#px = e.clientX;
    this.#py = e.clientY;
    for (const s of this.#options.scrollables) {
      this.#candidates.push(s);
    }
    this.#candidates.sort(compareByDepth);
    this.#schedule();
  }

  onMove(e: PointerEvent) {
    this.#px = e.clientX;
    this.#py = e.clientY;
  }

  onStop() {
    this.#candidates.length = 0;
    if (this.#rafId !== undefined) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = undefined;
    }
  }

  #schedule() {
    this.#rafId = requestAnimationFrame(() => {
      this.#tick();
      this.#schedule();
    });
  }

  #tick() {
    const { zone = 0.15, maxSpeed = 20 } = this.#options;

    for (const el of this.#candidates) {
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
        this.#px < rect.left ||
        this.#px > rect.right ||
        this.#py < rect.top ||
        this.#py > rect.bottom
      )
        continue;

      const dx = edgeSpeed(this.#px, rect.left, rect.right, zone, maxSpeed);
      const dy = edgeSpeed(this.#py, rect.top, rect.bottom, zone, maxSpeed);

      if (dx !== 0 || dy !== 0) {
        el.scrollBy({ left: dx, top: dy });
        break;
      }
    }
  }
}
