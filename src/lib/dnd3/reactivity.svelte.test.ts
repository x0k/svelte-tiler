import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';

import ReactiveProbe from './ReactiveProbe.svelte';
import { createDnd, createDroppable, drop, element } from './index.js';

function fire(
  el: EventTarget,
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('template reactivity', () => {
  it('should update isDragged/isOver bindings during a drag', async () => {
    const { getByTestId } = render(ReactiveProbe);
    const item = getByTestId('item').element() as HTMLElement;
    const zone = getByTestId('zone').element() as HTMLElement;

    expect(item.getAttribute('data-dragged')).toBe('false');
    expect(zone.getAttribute('data-over')).toBe('false');

    fire(item, 'pointerdown', 10, 10);
    fire(window, 'pointermove', 60, 60);
    await flush();

    expect(item.getAttribute('data-dragged')).toBe('true');

    fire(window, 'pointermove', 250, 250);
    await flush();
    expect(zone.getAttribute('data-over')).toBe('true');

    fire(window, 'pointermove', 20, 20);
    await flush();
    expect(zone.getAttribute('data-over')).toBe('false');

    fire(window, 'pointerup', 20, 20);
    await flush();
    expect(item.getAttribute('data-dragged')).toBe('false');
  });

  it('should track element attachment reactively', async () => {
    const dnd = createDnd();
    const droppable = createDroppable(dnd, { id: 'z' });
    const el = document.createElement('div');
    const seen: (HTMLElement | undefined)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(element(droppable));
      });
    });

    const detach = drop(droppable)(el) as () => void;
    await flush();
    expect(seen).toEqual([el]);

    detach();
    await flush();
    expect(seen).toEqual([el, undefined]);

    stop();
  });
});
