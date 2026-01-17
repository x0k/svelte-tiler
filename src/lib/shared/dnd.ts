import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';
import { noop } from './function.ts';

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

interface DndManager {
	sourceId: string | undefined;
	targetId: string | undefined;
}

export function createDndManager(): DndManager {
	return {};
}

export interface Draggable {
	isDragged: boolean | undefined;
	// element: Attachment<HTMLElement>;
	handle: Attachment<HTMLElement>;
}

export interface DraggableOptions<D> {
	data?: D;
	onStart?: (e: PointerEventWithTarget) => void;
	onMove?: (e: PointerEvent) => void;
	onDrop?: () => void;
	onStop?: () => void;
}

export function createDraggable<D>(ctx: DndManager, options: DraggableOptions<D>): Draggable {
	const id = crypto.randomUUID();
	return {
		get isDragged() {
			return ctx.sourceId === id;
		},
		// element(el) {},
		handle: onDragStart((e) => {
			ctx.sourceId = id;
			options.onStart?.(e);
			return {
				onMove: options.onMove ?? noop,
				onStop() {
					options.onStop?.();
					ctx.sourceId = undefined;
				}
			};
		})
	};
}

export interface DroppableOptions<T extends Tile> {
	accept: (tile: Tile) => tile is T;
	onDrop: (tile: T) => void;
}

export interface Droppable {
	isReady: boolean;
	isOver: boolean;
	attachment: Attachment<HTMLElement>;
}
