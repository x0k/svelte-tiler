import { SvelteMap } from 'svelte/reactivity';
import { on } from 'svelte/events';

type WithTarget<E extends UIEvent> = E & {
	currentTarget: HTMLElement;
};

export type PointerEventWithTarget = WithTarget<PointerEvent>;

const INTERNALS = Symbol();

export class DndContext<D> {
	sourceId: string | undefined = $state.raw();
	targetId: string | undefined = $state.raw();
	draggables = new SvelteMap<string, Draggable<D>>();
	droppables = new SvelteMap<string, Droppable<D, any, any>>();

	findDroppable(
		draggable: Draggable<D>,
		{ clientX: x, clientY: y }: PointerEvent
	): Droppable<D, any, any> | undefined {
		const data = draggable.data;
		const isDataDefined = data !== undefined;
		for (const d of this.droppables.values()) {
			if (d.element === undefined) {
				continue;
			}
			const r = d.element?.getBoundingClientRect();
			if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
				continue;
			}
			if (d.accepts === undefined || (isDataDefined && d.accepts(data))) {
				return d;
			}
		}
	}
}

export type StopReason = 'drop' | 'cancel';

export interface DraggableOptions<D> {
	data?: D;
	feedback?: (
		el: HTMLElement,
		e: PointerEventWithTarget
	) => {
		onMove: (e: PointerEvent) => void;
		onStop: (reason: StopReason) => void;
	};
	onStart?: (e: PointerEventWithTarget) => void;
	onMove?: (e: PointerEvent) => void;
	onStop?: () => void;
}

export class Draggable<D = unknown> {
	id = crypto.randomUUID();

	#options: DraggableOptions<D> = {};
	#element: HTMLElement | undefined = $state.raw();
	#disposePointerDownListener: (() => void) | undefined;

	constructor(
		protected readonly ctx: DndContext<D>,
		protected readonly optionsOrFactory:
			| DraggableOptions<D>
			| ((e: PointerEventWithTarget) => DraggableOptions<D>)
	) {}

	get data() {
		return this.#options.data;
	}

	get element() {
		return this.#element;
	}

	get isDragged() {
		return this.ctx.sourceId === this.id;
	}

	[Symbol.dispose]() {
		this.#disposePointerDownListener?.();
		this.#element = undefined;
		this.ctx.draggables.delete(this.id);
	}

	register = (el: HTMLElement) => {
		this.ctx.draggables.set(this.id, this);
		this.#element = el;
		this.#disposePointerDownListener = on(el, 'pointerdown', this.createPointerDownHandler(el));
		return () => {
			this[Symbol.dispose]();
		};
	};

	protected createPointerDownHandler(el: HTMLElement) {
		return (e: PointerEventWithTarget) => {
			console.log('HANDLER');
			if (e.button !== 0) return;

			el.setPointerCapture(e.pointerId);

			const abortController = new AbortController();

			this.ctx.sourceId = this.id;
			this.#options =
				typeof this.optionsOrFactory === 'function'
					? this.optionsOrFactory(e)
					: this.optionsOrFactory;

			const feedback = this.#options.feedback?.(el, e);

			this.#options.onStart?.(e);

			let activeDroppable: Droppable<D, any, any> | undefined;
			const handleMove = (e: PointerEvent) => {
				this.#options.onMove?.(e);

				feedback?.onMove(e);

				const nextDroppable = this.ctx.findDroppable(this, e);
				if (activeDroppable !== nextDroppable) {
					activeDroppable?.[INTERNALS].onLeave?.();
					nextDroppable?.[INTERNALS].onEnter?.();
					activeDroppable = nextDroppable;
					this.ctx.targetId = activeDroppable?.id;
				}
				activeDroppable?.[INTERNALS].onMove?.(e);
			};

			const handleStop = (reason: StopReason) => {
				el.releasePointerCapture(e.pointerId);
				abortController.abort();

				if (reason === 'drop') {
					activeDroppable?.[INTERNALS].onDrop?.(this.#options.data as D);
				}
				activeDroppable?.[INTERNALS].onLeave?.();
				this.ctx.targetId = undefined;

				feedback?.onStop(reason);

				this.#options.onStop?.();
				this.ctx.sourceId = undefined;
			};

			function onKeydown(e: KeyboardEvent) {
				if (e.key === 'Escape') {
					handleStop('cancel');
				}
			}

			window.addEventListener('pointermove', handleMove, abortController);
			window.addEventListener('pointerup', () => handleStop('drop'), abortController);
			window.addEventListener('keydown', onKeydown, abortController);
			window.addEventListener('contextmenu', () => handleStop('cancel'), abortController);
		};
	}
}

export interface DroppableOptions<D, T extends D, M> {
	accepts?: (data: D) => data is T;
	onEnter?: () => M;
	onMove?: (e: PointerEvent) => M;
	onLeave?: () => M;
	onDrop?: (data: T) => M;
}

export class Droppable<D, T extends D, M> {
	#element: HTMLElement | undefined = $state.raw();
	#options: DroppableOptions<D, T, M> = {};
	#meta: M | undefined = $state.raw();

	readonly id = crypto.randomUUID();
	readonly [INTERNALS]: Required<Omit<DroppableOptions<D, T, void>, 'accepts'>> = {
		onDrop: (data) => {
			if (this.#options.onDrop) {
				this.#meta = this.#options.onDrop(data);
			}
		},
		onEnter: () => {
			if (this.#options.onEnter) {
				this.#meta = this.#options.onEnter();
			}
		},
		onLeave: () => {
			if (this.#options.onLeave) {
				this.#meta = this.#options.onLeave();
			}
		},
		onMove: (e) => {
			if (this.#options.onMove) {
				this.#meta = this.#options.onMove(e);
			}
		}
	};

	constructor(
		protected readonly ctx: DndContext<D>,
		protected readonly optionsOrFactory:
			| DroppableOptions<D, T, M>
			| ((el: HTMLElement) => DroppableOptions<D, T, M>)
	) {}

	get accepts() {
		return this.#options.accepts;
	}

	get element() {
		return this.#element;
	}

	get isOver() {
		return this.ctx.targetId === this.id;
	}

	get meta() {
		return this.#meta;
	}

	[Symbol.dispose]() {
		this.#element = undefined;
		this.ctx.droppables.delete(this.id);
	}

	register = (el: HTMLElement) => {
		this.ctx.droppables.set(this.id, this);
		this.#element = el;
		return () => {
			this[Symbol.dispose]();
		};
	};

	protected setInternals(el: HTMLElement) {
		this.#options =
			typeof this.optionsOrFactory === 'function'
				? this.optionsOrFactory(el)
				: this.optionsOrFactory;
	}
}

export class ClonedGhost {
	#element: HTMLElement;
	#offsetX: number;
	#offsetY: number;

	constructor(element: HTMLElement, event: PointerEventWithTarget) {
		const rect = element.getBoundingClientRect();
		this.#element = element.cloneNode(true) as HTMLElement;
		this.#offsetX = event.clientX - rect.left;
		this.#offsetY = event.clientY - rect.top;

		this.#element.style.position = 'fixed';
		this.#element.style.left = '0';
		this.#element.style.top = '0';
		this.#element.style.width = `${rect.width}px`;
		this.#element.style.height = `${rect.height}px`;
		this.#element.style.pointerEvents = 'none';
		this.#element.style.zIndex = '9999';
		this.#element.style.opacity = '0.85';
		this.onMove(event);
	}

	attach(root = document.body) {
		root.appendChild(this.#element);
		return this;
	}

	onMove(e: PointerEvent) {
		const x = e.clientX - this.#offsetX;
		const y = e.clientY - this.#offsetY;
		this.#element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
	}

	onStop() {
		this.#element.remove();
	}
}
