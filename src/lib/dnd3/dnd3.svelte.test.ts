import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { ACTIONS, REGISTRY, STATE } from './model.js';
import type { Dnd, DndPlugin } from './model.js';
import {
  operation,
  closestCenter,
  createDnd,
  createDraggable,
  createDroppable,
  data,
  delta,
  drag,
  dragHandle,
  draggables,
  operations,
  drop,
  droppables,
  element,
  ghost,
  isDisabled,
  isDragged,
  isOver,
  setDisabled,
  pointerSensor,
  rectContains,
  resolveTarget,
  source,
  status,
  subscribe,
  target,
} from './index.js';
import type { DroppableOptions } from './model.js';

interface Item {
  value: number;
}

function fire(
  el: Element | Window,
  type: string,
  x: number,
  y: number,
  pointerId = 1
) {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId,
      isPrimary: true,
    })
  );
}

function setup(
  plugins: NonNullable<Parameters<typeof createDnd>[0]>['plugins'] = [],
  droppableOptions: DroppableOptions<Item, Item> = {}
) {
  const dnd = createDnd<Item>({ plugins });
  const sourceEl = document.createElement('div');
  const targetEl = document.createElement('div');
  sourceEl.style.cssText =
    'position:absolute;left:0;top:0;width:50px;height:50px;';
  targetEl.style.cssText =
    'position:absolute;left:200px;top:200px;width:100px;height:100px;';
  document.body.append(sourceEl, targetEl);

  const draggable = createDraggable(dnd, {
    id: 'src',
    data: () => ({ value: 42 }),
  });
  const droppable = createDroppable<Item, Item>(dnd, {
    id: 'dst',
    ...droppableOptions,
  });
  drag(draggable)(sourceEl);
  drop(droppable)(targetEl);

  const dispose = () => {
    dnd[Symbol.dispose]();
    sourceEl.remove();
    targetEl.remove();
  };

  return { dnd, draggable, droppable, sourceEl, targetEl, dispose };
}

describe('dnd3', () => {
  it('should run full lifecycle: start → over → drop', () => {
    const events: string[] = [];
    const entered: unknown[] = [];
    let dropped: unknown;
    let finishReason: string | undefined;

    const { dnd, droppable, sourceEl, dispose } = setup([pointerSensor()], {
      onEnter: (draggable) => {
        entered.push(data(draggable));
        events.push('enter');
      },
      onDrop: (droppedData) => {
        dropped = droppedData;
        events.push('drop');
      },
    });

    subscribe(dnd, 'finish', ({ reason }) => {
      finishReason = reason;
    });

    expect(status(dnd)).toBe('idle');

    fire(sourceEl, 'pointerdown', 10, 10);
    expect(status(dnd)).toBe('idle');

    fire(window, 'pointermove', 12, 12);
    expect(status(dnd)).toBe('idle');

    fire(window, 'pointermove', 40, 40);
    expect(status(dnd)).toBe('dragging');

    fire(window, 'pointermove', 250, 250);
    expect(events).toEqual(['enter']);
    const op = operation(dnd)!;
    expect(isOver(droppable)).toBe(true);
    expect(delta(op)).toEqual({ x: 210, y: 210 });

    fire(window, 'pointerup', 250, 250);
    expect(finishReason).toBe('drop');
    expect(events).toEqual(['enter', 'drop']);
    expect(dropped).toEqual({ value: 42 });
    expect(status(dnd)).toBe('idle');
    expect(operations(dnd).size).toBe(0);
    expect(isOver(droppable)).toBe(false);

    dispose();
  });

  it('should cancel on Escape', () => {
    const { dnd, sourceEl, dispose } = setup([pointerSensor()]);
    let reason: string | undefined;
    subscribe(dnd, 'finish', ({ reason: r }) => {
      reason = r;
    });

    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 60, 60);
    expect(status(dnd)).toBe('dragging');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(reason).toBe('cancel');
    expect(status(dnd)).toBe('idle');

    dispose();
  });

  it('should respect activation threshold', () => {
    const { dnd, sourceEl, dispose } = setup([pointerSensor({ threshold: 8 })]);
    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 14, 14);
    expect(status(dnd)).toBe('idle');
    fire(window, 'pointerup', 14, 14);
    expect(status(dnd)).toBe('idle');
    dispose();
  });

  it('should support handles and ignore interactive elements', () => {
    const { dnd, draggable, sourceEl, dispose } = setup([pointerSensor()]);
    const handle = document.createElement('span');
    sourceEl.appendChild(handle);
    dragHandle(draggable)(handle);

    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 80, 80);
    expect(status(dnd)).toBe('idle');
    fire(window, 'pointerup', 80, 80);

    const button = document.createElement('button');
    sourceEl.appendChild(button);

    fire(button, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 80, 80);
    expect(status(dnd)).toBe('idle');

    fire(handle, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 80, 80);
    expect(status(dnd)).toBe('dragging');

    fire(window, 'pointerup', 80, 80);
    expect(status(dnd)).toBe('idle');
    dispose();
  });

  it('should support beforeDrop prevention', () => {
    const { dnd, droppable, sourceEl, dispose } = setup([pointerSensor()]);
    const offBefore = subscribe(dnd, 'beforeDrop', (e) => e.preventDefault());
    let dropped = false;
    droppable[STATE].options.onDrop = () => {
      dropped = true;
    };
    let reason: string | undefined;
    subscribe(dnd, 'finish', ({ reason: r }) => {
      reason = r;
    });

    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 250, 250);
    fire(window, 'pointerup', 250, 250);

    expect(reason).toBe('cancel');
    expect(dropped).toBe(false);
    offBefore();
    dispose();
  });

  it('should resolve source and target from an operation', () => {
    const { dnd, sourceEl, draggable, dispose } = setup([pointerSensor()]);
    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 250, 250);

    const op = operation(dnd)!;
    expect(source(op)?.id).toBe('src');
    expect(target(op)?.id).toBe('dst');
    expectTypeOf(data(draggable)).toEqualTypeOf<Item | undefined>();
    expect(data(draggable)).toEqual({ value: 42 });
    expect(isDragged(draggable)).toBe(true);

    fire(window, 'pointerup', 250, 250);
    expect(isDragged(draggable)).toBe(false);
    expect(operations(dnd).size).toBe(0);
    dispose();
  });

  it('should spawn and remove a ghost clone', () => {
    const portal = document.createElement('div');
    document.body.appendChild(portal);
    const { sourceEl, dispose } = setup([
      pointerSensor(),
      ghost({ portalTo: () => portal }),
    ]);

    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 60, 60);
    expect(portal.children.length).toBe(1);
    const clone = portal.children[0] as HTMLElement;
    expect(clone.style.transform).toContain('translate3d');

    fire(window, 'pointermove', 120, 120);
    expect(clone.style.transform).not.toContain('translate3d(0px, 0px');

    fire(window, 'pointerup', 120, 120);
    expect(portal.children.length).toBe(0);

    dispose();
    portal.remove();
  });

  it('should keep independent operations per pointer', () => {
    const second = document.createElement('div');
    second.style.cssText =
      'position:absolute;left:400px;top:400px;width:50px;height:50px;';
    document.body.appendChild(second);

    const { dnd, droppable, sourceEl, dispose } = setup([pointerSensor()]);
    const other = createDraggable(dnd, { id: 'other' });
    drag(other)(second);

    fire(sourceEl, 'pointerdown', 10, 10, 1);
    fire(second, 'pointerdown', 410, 410, 2);
    fire(window, 'pointermove', 250, 250, 1);
    fire(window, 'pointermove', 420, 420, 2);

    expect(operations(dnd).size).toBe(2);
    expect(operation(dnd)!.pointerId).toBe(1);
    expect(isOver(droppable)).toBe(true);

    fire(window, 'pointerup', 250, 250, 1);
    expect(operations(dnd).size).toBe(1);
    fire(window, 'pointerup', 420, 420, 2);
    expect(operations(dnd).size).toBe(0);

    dispose();
    second.remove();
  });

  it('should allow swapping the target resolver', () => {
    const { dnd, sourceEl, dispose } = setup([pointerSensor()]);
    const custom = document.createElement('div');
    custom.style.cssText =
      'position:absolute;left:600px;top:600px;width:50px;height:50px;';
    document.body.appendChild(custom);
    let entered = false;
    const customDroppable = createDroppable(dnd, {
      id: 'custom',
      onEnter: () => {
        entered = true;
      },
    });
    drop(customDroppable)(custom);

    dnd[ACTIONS].resolveTarget = (op) =>
      op.current.x >= 0 ? dnd[REGISTRY].droppables.get('custom') : undefined;

    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 250, 250);

    expect(entered).toBe(true);
    const op = operation(dnd)!;
    expect(target(op)?.id).toBe('custom');

    fire(window, 'pointerup', 250, 250);
    expect(operations(dnd).size).toBe(0);

    dispose();
    custom.remove();
  });

  it('should thread payload types from the context', () => {
    const typedPlugin: DndPlugin<Item> = (dnd) => {
      const op = operation(dnd);
      if (op) {
        expectTypeOf(data(source(op))).toEqualTypeOf<Item | undefined>();
      }
      return () => {};
    };
    const dnd = createDnd({ plugins: [typedPlugin] });
    expectTypeOf(dnd).toEqualTypeOf<Dnd<Item>>();

    const el = document.createElement('div');
    const draggable = createDraggable(dnd, {
      id: 'x',
      data: () => ({ value: 1 }),
    });
    const detach = drag(draggable)(el) as () => void;
    expectTypeOf(data(draggable)).toEqualTypeOf<Item | undefined>();
    expect(data(draggable)).toEqual({ value: 1 });

    const op = dnd[ACTIONS].start({
      pointerId: 1,
      sourceId: 'x',
      point: { x: 0, y: 0 },
      shape: { left: 0, top: 0, width: 0, height: 0 },
    });
    expectTypeOf(data(source(op))).toEqualTypeOf<Item | undefined>();
    expect(source(op)?.id).toBe('x');

    let finished = false;
    const offFinish = subscribe(dnd, 'finish', ({ op: finishOp }) => {
      expectTypeOf(data(source(finishOp))).toEqualTypeOf<Item | undefined>();
      finished = true;
    });
    dnd[ACTIONS].stop(1);
    offFinish();
    detach();
    expect(finished).toBe(true);
  });

  it('should notify subscribers with entities on registration', () => {
    const dnd = createDnd();
    const events: unknown[] = [];
    const off = dnd[REGISTRY].subscribe((event) => {
      if (event.type === 'draggable') {
        expectTypeOf(event.entity.id).toEqualTypeOf<string>();
      }
      events.push(event);
    });

    const el = document.createElement('div');
    const draggable = createDraggable(dnd, { id: 'x' });
    const detach = drag(draggable)(el) as () => void;
    detach();
    drag(draggable)(el);

    expect(events).toEqual([
      { type: 'draggable', entity: draggable, added: true },
      { type: 'draggable', entity: draggable, added: false },
      { type: 'draggable', entity: draggable, added: true },
    ]);

    off();
    const detach2 = drag(draggable)(el) as () => void;
    detach2();
    expect(events.length).toBe(3);

    dnd[Symbol.dispose]();
  });

  it('should skip disabled entities', () => {
    const { dnd, sourceEl, dispose } = setup([pointerSensor()]);
    const disabledSource = document.createElement('div');
    disabledSource.style.cssText =
      'position:absolute;left:0;top:0;width:50px;height:50px;';
    document.body.append(disabledSource);
    const disabledDraggable = createDraggable(dnd, {
      id: 'disabled-src',
      disabled: true,
    });
    drag(disabledDraggable)(disabledSource);

    fire(disabledSource, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 250, 250);
    expect(status(dnd)).toBe('idle');

    const disabledDrop = document.createElement('div');
    disabledDrop.style.cssText =
      'position:absolute;left:200px;top:200px;width:100px;height:100px;';
    document.body.append(disabledDrop);
    const disabledDroppable = createDroppable(dnd, {
      id: 'disabled-dst',
      disabled: true,
    });
    drop(disabledDroppable)(disabledDrop);
    const onEnter = vi.fn();
    disabledDroppable[STATE].options.onEnter = onEnter;

    fire(sourceEl, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 250, 250);
    expect(onEnter).not.toHaveBeenCalled();
    expect(isOver(disabledDroppable)).toBe(false);

    fire(window, 'pointerup', 250, 250);
    expect(status(dnd)).toBe('idle');

    dispose();
    disabledSource.remove();
    disabledDrop.remove();
  });

  it('should score collisions with detectors', () => {
    const rect = new DOMRect(0, 0, 100, 100);

    expect(rectContains({ point: { x: 50, y: 50 }, shape: rect }, rect)).toBe(
      0
    );
    expect(rectContains({ point: { x: 150, y: 50 }, shape: rect }, rect)).toBe(
      null
    );

    expect(closestCenter({ point: { x: 50, y: 50 }, shape: rect }, rect)).toBe(
      0
    );
    expect(closestCenter({ point: { x: 150, y: 50 }, shape: rect }, rect)).toBe(
      100
    );
  });

  it('should expose entity reads for custom strategies', () => {
    const dnd = createDnd();
    const dp = createDroppable(dnd, { id: 'z' });
    const dg = createDraggable(dnd, { id: 'g' });
    const el = document.createElement('div');
    drop(dp)(el);
    drag(dg)(el);

    expect(droppables(dnd).get('z')).toBe(dp);
    expect(draggables(dnd).get('g')).toBe(dg);
    expect([...droppables(dnd).values()]).toEqual([dp]);
    expect(isDisabled(dp)).toBe(false);
    setDisabled(dp, true);
    expect(isDisabled(dp)).toBe(true);
    setDisabled(dp, false);
    expect(element(dp)).toBe(el);

    dnd[Symbol.dispose]();
  });

  it('should support custom targeting built from the public API', () => {
    const dnd = createDnd<Item>({
      plugins: [pointerSensor()],
      resolveTarget: (ctx, op) => {
        const candidate = resolveTarget(ctx, op);
        if (!candidate) {
          return undefined;
        }
        return element(candidate)?.dataset.zone === 'forbidden'
          ? undefined
          : candidate;
      },
    });

    const sourceEl = document.createElement('div');
    const forbiddenEl = document.createElement('div');
    forbiddenEl.dataset.zone = 'forbidden';
    const okEl = document.createElement('div');
    okEl.dataset.zone = 'ok';
    sourceEl.style.cssText =
      'position:absolute;left:0;top:0;width:50px;height:50px;';
    forbiddenEl.style.cssText =
      'position:absolute;left:200px;top:200px;width:100px;height:100px;';
    okEl.style.cssText =
      'position:absolute;left:400px;top:400px;width:100px;height:100px;';
    document.body.append(sourceEl, forbiddenEl, okEl);

    const draggable = createDraggable(dnd, {
      id: 'src',
      data: () => ({ value: 7 }),
    });
    const forbiddenZone = createDroppable(dnd, { id: 'nope' });
    const okZone = createDroppable(dnd, { id: 'ok' });
    drag(draggable)(sourceEl);
    drop(forbiddenZone)(forbiddenEl);
    drop(okZone)(okEl);

    fire(sourceEl, 'pointerdown', 10, 10);

    fire(window, 'pointermove', 250, 250);
    expect(target(operation(dnd)!)).toBeUndefined();
    expect(isOver(forbiddenZone)).toBe(false);
    expect(isOver(okZone)).toBe(false);

    fire(window, 'pointerup', 250, 250);
    fire(sourceEl, 'pointerdown', 10, 10);

    fire(window, 'pointermove', 450, 450);
    expect(target(operation(dnd)!)?.id).toBe('ok');

    let droppedFor: string | undefined;
    subscribe(dnd, 'drop', (e) => {
      droppedFor = target(e.op)?.id;
    });
    fire(window, 'pointerup', 450, 450);
    expect(droppedFor).toBe('ok');
    expect(status(dnd)).toBe('idle');

    sourceEl.remove();
    forbiddenEl.remove();
    okEl.remove();
  });
});
