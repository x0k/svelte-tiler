import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';

type WithTarget<E extends UIEvent> = E & {
	currentTarget: HTMLElement;
};

export type PointerEventWithTarget = WithTarget<PointerEvent>;

interface DndContext<Data = unknown> {
	sourceId: string | undefined;
	readonly sourceData?: Data;
	setSourceData(ref: () => Data | undefined): void;
	targetId: string | undefined;
}

const constantUndefined = () => undefined;

class DndContextImpl<D> implements DndContext<D> {
	#dataRef: () => D | undefined = $state.raw(constantUndefined);

	sourceId: string | undefined = $state.raw();
	get sourceData() {
		return this.#dataRef();
	}
	targetId: string | undefined = $state.raw();

	setSourceData(ref: () => D | undefined): void {
		this.#dataRef = ref;
	}
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

export function createDraggable<D>(ctx: DndContext<D>, options: DraggableOptions<D>): Draggable {
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
				ctx.setSourceData(() => options.data);
				options.onStart?.(e);

				function handleMove(e: PointerEvent) {
					options.onMove?.(e);
				}

				function handleStop() {
					el.releasePointerCapture(e.pointerId);
					abortController.abort();
					options.onStop?.();
					ctx.setSourceData(constantUndefined);
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

export interface Droppable {
	isReady: boolean;
	isOver: boolean;
	element: Attachment<HTMLElement>;
}

export interface DroppableOptions<D, T extends D = D> {
	accept?: (data: D) => data is T;
	onEnter?: () => void;
	onLeave?: () => void;
	onDrop?: (data: T) => void;
}

export function createDroppable<D, T extends D>(
	ctx: DndContext<D>,
	options: DroppableOptions<D, T>
): Droppable {
	const id = crypto.randomUUID();
	return {
		get isReady() {
			const data = ctx.sourceData;
			return data !== undefined && options.accept?.(data) === true;
		},
		get isOver() {
			return ctx.targetId === id;
		},
		element: (el) => {}
	};
}
