import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';

type WithTarget<E extends UIEvent> = E & {
	currentTarget: HTMLElement;
};

type PointerEventWithTarget = WithTarget<PointerEvent>;

export type DragStartHandlersFactory = (e: PointerEventWithTarget) => {
	onMove: (e: PointerEvent) => void;
	onStop?: () => void;
};

export function onDragStart(createHandlers: DragStartHandlersFactory): Attachment<HTMLElement> {
	return (el) =>
		on(el, 'pointerdown', (e) => {
			if (e.button !== 0) return;

			el.setPointerCapture(e.pointerId);

			const abortController = new AbortController();
			const { onMove, onStop } = createHandlers(e);

			function handleStop() {
				el.releasePointerCapture(e.pointerId);
				abortController.abort();
				onStop?.();
			}

			function onKeydown(e: KeyboardEvent) {
				if (e.key === 'Escape') {
					handleStop();
				}
			}

			window.addEventListener('pointermove', onMove, abortController);
			window.addEventListener('pointerup', handleStop, abortController);
			window.addEventListener('keydown', onKeydown, abortController);
			window.addEventListener('contextmenu', handleStop, abortController);
		});
}
