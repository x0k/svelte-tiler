import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';

type WithTarget<E extends UIEvent> = E & {
	currentTarget: HTMLElement;
};

export type PointerEventWithTarget = WithTarget<PointerEvent>;

interface DndContext<Data = unknown> {
	__data?: Data;
	sourceId: string | undefined;
	targetId: string | undefined;
}

class DndContextImpl<D> implements DndContext<D> {
	sourceId: string | undefined = $state.raw();
	targetId: string | undefined = $state.raw();
}

export function createDndContext<D>(): DndContext<D> {
	return new DndContextImpl();
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
	onStop?: () => void;
}

export function createDraggable<D>(
	ctx: DndContext<D>,
	options: DraggableOptions<D>
): Draggable {
	const id = crypto.randomUUID();
	return {
		get isDragged() {
			return ctx.sourceId === id;
		},
		// element(el) {},
		handle: (el) =>
			on(el, 'pointerdown', (e) => {
				if (e.button !== 0) return;

				el.setPointerCapture(e.pointerId);

				const abortController = new AbortController();

				ctx.sourceId = id;
				options.onStart?.(e);

				function handleMove(e: PointerEvent) {
					options.onMove?.(e);
				}

				function handleStop() {
					el.releasePointerCapture(e.pointerId);
					abortController.abort();
					options.onStop?.();
					ctx.sourceId = undefined;
				}

				function onKeydown(e: KeyboardEvent) {
					if (e.key === 'Escape') {
						handleStop();
					}
				}

				window.addEventListener('pointermove', handleMove, abortController);
				window.addEventListener('pointerup', handleStop, abortController);
				window.addEventListener('keydown', onKeydown, abortController);
				window.addEventListener('contextmenu', handleStop, abortController);
			})
	};
}

// export interface DroppableOptions<T extends Tile> {
// 	accept: (tile: Tile) => tile is T;
// 	onDrop: (tile: T) => void;
// }

export interface Droppable {
	isReady: boolean;
	isOver: boolean;
	attachment: Attachment<HTMLElement>;
}
