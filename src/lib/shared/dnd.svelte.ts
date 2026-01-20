import { SvelteMap } from 'svelte/reactivity';
import { on } from 'svelte/events';

type WithTarget<E extends UIEvent> = E & {
	currentTarget: HTMLElement;
};

export type PointerEventWithTarget = WithTarget<PointerEvent>;

const ON_ENTER = Symbol('on-enter-key');
const ON_MOVE = Symbol('on-move-key');
const ON_LEAVE = Symbol('on-leave-key');
const ON_DROP = Symbol('on-drop-key');

export class DndContext<D = unknown> {
	sourceId: string | undefined = $state.raw();
	targetId: string | undefined = $state.raw();
	draggables = new SvelteMap<string, Draggable<D>>();
	droppables = new SvelteMap<string, Droppable<D, any>>();

	findDroppable(x: number, y: number, data: D | undefined): Droppable<D, any> | undefined {
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

export interface StopEvent {
	reason: StopReason;
}

export class Draggable<D = unknown> {
	protected _disposePointerDownHandler: (() => void) | undefined;
	protected _disposeClickHandler: (() => void) | undefined;
	protected didDrag = false;

	id = crypto.randomUUID();

	constructor(
		protected readonly ctx: DndContext<D>,
		protected readonly dataRef?: () => D
	) {
		this.register = this.register.bind(this);
	}

	get isDragged() {
		return this.ctx.sourceId === this.id;
	}

	register(el: HTMLElement) {
		this.ctx.draggables.set(this.id, this);
		this._disposePointerDownHandler = on(el, 'pointerdown', (e) => this.pointerDownHandler(e));
		this._disposeClickHandler = on(
			el,
			'click',
			(e) => {
				if (!this.didDrag) {
					return;
				}
				e.stopImmediatePropagation();
				e.preventDefault();
				this.didDrag = false;
			},
			{ capture: true }
		);
		return () => {
			this[Symbol.dispose]();
		};
	}

	[Symbol.dispose]() {
		this._disposeClickHandler?.();
		this._disposePointerDownHandler?.();
		this.ctx.draggables.delete(this.id);
	}

	protected feedback(
		_el: HTMLElement,
		_e: PointerEvent
	): { onMove: (e: PointerEvent) => void; onStop: (e: StopEvent) => void } | undefined {
		return undefined;
	}

	protected onStart(_el: HTMLElement, _e: PointerEvent) {}

	protected onMove(_e: PointerEvent) {}

	protected onStop(_e: StopEvent) {}

	protected pointerDownHandler(event: PointerEventWithTarget) {
		if (event.button !== 0 || !event.isPrimary) {
			return;
		}

		const el = event.currentTarget;

		el.setPointerCapture(event.pointerId);

		const abortController = new AbortController();

		let feedback:
			| {
					onMove: (e: PointerEvent) => void;
					onStop: (e: StopEvent) => void;
			  }
			| undefined;
		let data: D | undefined;

		let activeDroppable: Droppable<D, any> | undefined;
		const handleMove = (e: PointerEvent) => {
			if (e.pointerId !== event.pointerId) {
				return;
			}

			if (!this.didDrag) {
				const dx = e.clientX - event.clientX;
				const dy = e.clientY - event.clientY;
				if (dx * dx + dy * dy < 16) {
					return;
				}
				this.didDrag = true;
				this.ctx.sourceId = this.id;
				feedback = this.feedback(el, e);
				this.onStart(el, e);
				data = this.dataRef?.();
			}

			this.onMove(e);

			feedback?.onMove(e);

			const nextDroppable = this.ctx.findDroppable(e.clientX, e.clientY, data);
			if (activeDroppable !== nextDroppable) {
				activeDroppable?.[ON_LEAVE]();
				nextDroppable?.[ON_ENTER]();
				activeDroppable = nextDroppable;
				this.ctx.targetId = activeDroppable?.id;
			}
			activeDroppable?.[ON_MOVE](e);
		};

		const handleStop = (ev: StopEvent) => {
			el.releasePointerCapture(event.pointerId);
			abortController.abort();

			if (!this.didDrag) {
				return;
			}

			if (ev.reason === 'drop') {
				activeDroppable?.[ON_DROP](data as D);
			}
			activeDroppable?.[ON_LEAVE]();
			this.ctx.targetId = undefined;

			feedback?.onStop(ev);

			this.onStop(ev);
			this.ctx.sourceId = undefined;
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
				handleStop({ reason: 'drop' });
			},
			abortController
		);
		window.addEventListener('keydown', onKeydown, abortController);
		window.addEventListener('contextmenu', () => handleStop({ reason: 'cancel' }), abortController);
	}
}

export class Droppable<D = unknown, T extends D = D> {
	protected _element: HTMLElement | undefined = $state.raw();

	readonly id = crypto.randomUUID();

	constructor(protected readonly ctx: DndContext<D>) {
		this.register = this.register.bind(this);
	}

	get element() {
		return this._element;
	}

	get isOver() {
		return this.ctx.targetId === this.id;
	}

	[Symbol.dispose]() {
		this._element = undefined;
		this.ctx.droppables.delete(this.id);
	}

	register(el: HTMLElement) {
		this.ctx.droppables.set(this.id, this);
		this._element = el;
		return () => {
			this[Symbol.dispose]();
		};
	}

	accepts(data: D): data is T {
		return true;
	}

	[ON_ENTER]() {
		this.onEnter();
	}

	[ON_MOVE](e: PointerEvent) {
		this.onMove(e);
	}

	[ON_LEAVE]() {
		this.onLeave();
	}

	[ON_DROP](data: T) {
		this.onDrop(data);
	}

	protected onEnter() {}

	protected onMove(_e: PointerEvent) {}

	protected onLeave() {}

	protected onDrop(_data: T) {}
}

export class ClonedGhost {
	#element: HTMLElement;
	#offsetX: number;
	#offsetY: number;

	constructor(el: HTMLElement, e: PointerEvent) {
		const rect = el.getBoundingClientRect();
		this.#element = el.cloneNode(true) as HTMLElement;
		this.#offsetX = e.clientX - rect.left;
		this.#offsetY = e.clientY - rect.top;

		this.#element.style.position = 'fixed';
		this.#element.style.left = '0';
		this.#element.style.top = '0';
		this.#element.style.width = `${rect.width}px`;
		this.#element.style.height = `${rect.height}px`;
		this.#element.style.pointerEvents = 'none';
		this.#element.style.zIndex = '9999';
		this.#element.style.opacity = '0.85';
		this.onMove(e);
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
