import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';

import type { HTMLPointerEvent } from './html.ts';

export type DragStartHandlersFactory = (e: HTMLPointerEvent) => {
	onMove: (e: PointerEvent) => void;
	onUp?: () => void;
};

export function onDragStart(createHandlers: DragStartHandlersFactory): Attachment<HTMLElement> {
	return (el) =>
		on(el, 'pointerdown', (e) => {
			el.setPointerCapture(e.pointerId);

			const { onMove, onUp } = createHandlers(e);

			function onUpHandler() {
				el.releasePointerCapture(e.pointerId);
				onUp?.();
				window.removeEventListener('pointermove', onMove);
				window.removeEventListener('pointerup', onUpHandler);
			}

			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', onUpHandler);
		});
}
