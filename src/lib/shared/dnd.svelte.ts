import type { Attachment } from 'svelte/attachments';
import { SvelteMap } from 'svelte/reactivity';
import { on } from 'svelte/events';

type WithTarget<E extends UIEvent> = E & {
	currentTarget: HTMLElement;
};

export type PointerEventWithTarget = WithTarget<PointerEvent>;

interface DndContext<D> {
	sourceId: string | undefined;
	targetId: string | undefined;
	draggables: Map<string, Draggable<D>>;
	droppables: Map<string, Droppable>;
}

class DndContextImpl<D> implements DndContext<D> {
	sourceId: string | undefined = $state.raw();
	targetId: string | undefined = $state.raw();
	draggables = new SvelteMap<string, Draggable<D>>();
	droppables = new SvelteMap<string, Droppable>();
}

export function createDndContext<D>(): DndContext<D> {
	return new DndContextImpl();
}

export interface Draggable<D = unknown> {
	readonly element: HTMLElement | undefined;
	readonly data: D | undefined;
	readonly isDragged: boolean | undefined;
	register: Attachment<HTMLElement>;
	// handle: Attachment<HTMLElement>;
}

export interface DraggableOptions<D> {
	data?: D;
	onStart?: (e: PointerEventWithTarget) => void;
	onMove?: (e: PointerEvent) => void;
	onStop?: () => void;
}

export function createDraggable<D>(
	ctx: DndContext<D>,
	optionsOrFactory: DraggableOptions<D> | ((e: PointerEventWithTarget) => DraggableOptions<D>)
): Draggable<D> {
	const id = crypto.randomUUID();
	let element: HTMLElement | undefined = $state.raw();
	let options: DraggableOptions<D> = {};
	const self: Draggable<D> = {
		get element() {
			return element;
		},
		get data() {
			return options.data;
		},
		get isDragged() {
			return ctx.sourceId === id;
		},
		register(el) {
			ctx.draggables.set(id, self);
			element = el;
			const dispose = on(el, 'pointerdown', (e) => {
				if (e.button !== 0) return;

				el.setPointerCapture(e.pointerId);

				const abortController = new AbortController();

				ctx.sourceId = id;
				options = typeof optionsOrFactory === 'function' ? optionsOrFactory(e) : optionsOrFactory;

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
			});
			return () => {
				dispose();
				element = undefined;
				ctx.draggables.delete(id);
			};
		}
	};
	return self;
}

export interface Droppable {
	readonly element: HTMLElement | undefined;
	readonly isReady: boolean;
	readonly isOver: boolean;
	register: Attachment<HTMLElement>;
}

export interface DroppableOptions<D, T extends D = D> {
	accept?: (data: D) => data is T;
	onEnter?: () => void;
	onMove?: (e: PointerEvent) => void;
	onLeave?: () => void;
	onDrop?: (data: T) => void;
}

export function createDroppable<D, T extends D>(
	ctx: DndContext<D>,
	options: DroppableOptions<D, T>
): Droppable {
	const id = crypto.randomUUID();
	let element: HTMLElement | undefined = $state.raw();
	const self: Droppable = {
		get element() {
			return element;
		},
		get isReady() {
			const sId = ctx.sourceId;
			const data = sId !== undefined ? ctx.draggables.get(sId)?.data : undefined;
			return data !== undefined && options.accept?.(data) === true;
		},
		get isOver() {
			return ctx.targetId === id;
		},
		register(el) {
			ctx.droppables.set(id, self);
			element = el;
			return () => {
				element = undefined;
				ctx.droppables.delete(id);
			};
		}
	};
	return self;
}
