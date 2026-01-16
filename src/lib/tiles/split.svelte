<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	import { onDragStart } from '$lib/shared/dnd.js';
	import { getTileComponent, getTilerContext } from '$lib/context.js';

	import type { Tile, Tiles } from '../tile.js';
	import { createAttachmentKey, type Attachment } from 'svelte/attachments';

	export type Direction = 'row' | 'column';

	declare module '../tile.js' {
		interface TileRegistry {
			split: {
				weights: number[];
				direction: Direction;
				minWeight: number;
				resizer?: string;
				gapPx: number;
			};
		}
	}

	export interface SplitOptions<R extends string> {
		children: Tile[];
		weights?: number[];
		resizer?: R;
		/** @default "row" */
		direction?: Direction;
		/** @default 10 */
		minWeight?: number;
		/** @default 1 */
		gapPx?: number;
	}

	const one = () => 1;

	export function createSplit<R extends string>(options: SplitOptions<R>): Tiles['split'] {
		const weights = options.weights ?? options.children.map(one);
		const totalWeight = weights.reduce((a, b) => a + b, 0);
		const minWeight = options.minWeight ?? (totalWeight / weights.length) * 0.2;
		return {
			id: crypto.randomUUID(),
			type: 'split',
			children: options.children,
			weights,
			minWeight,
			direction: options.direction ?? 'row',
			resizer: options.resizer,
			gapPx: options.gapPx ?? 1
		};
	}

	export function createRow(...children: Tile[]) {
		return createSplit({
			direction: 'row',
			children
		});
	}

	export function createColumn(...children: Tile[]) {
		return createSplit({
			direction: 'column',
			children
		});
	}

	const SPLIT_CONTEXT_KEY = Symbol('split-context-key');

	export type ResizerProps = { [key: symbol]: Attachment<HTMLElement> };

	type SplitContext<R extends string = string> = {
		resizer: Record<R, Snippet<[ResizerProps, Tiles['split'], number]>>;
	};

	export function setupSplit<R extends string>(ctx: SplitContext<R>) {
		setContext(SPLIT_CONTEXT_KEY, ctx);
		return createSplit<R>;
	}
</script>

<script lang="ts">
	const { tile = $bindable() }: { tile: Tiles['split'] } = $props();

	const ctx = getTilerContext();
	const splitCtx = getContext<SplitContext | undefined>(SPLIT_CONTEXT_KEY);

	const resizer = $derived(
		(tile.resizer !== undefined && splitCtx?.resizer[tile.resizer]) || defaultResizer
	);

	let splitEl: HTMLDivElement;

	const attachmentKey = createAttachmentKey();
</script>

{#snippet defaultResizer(props: ResizerProps)}
	<div class="resizer" {...props}></div>
{/snippet}

<div bind:this={splitEl} class="split" style="--gap: ${tile.gapPx}px;" data-dir={tile.direction}>
	{#each tile.children as t, i (t.id)}
		{@const Component = getTileComponent(ctx, t)}
		{@const resizerProps = {
			[attachmentKey]: onDragStart((e) => {
				const resizerEl = e.currentTarget;
				const l = tile.weights.length;
				const isRow = tile.direction === 'row';
				const containerSize =
					(isRow ? splitEl.clientWidth : splitEl.clientHeight) - (l - 1) * tile.gapPx;
				const totalWeight = tile.weights.reduce((a, b) => a + b);
				const minWeight = tile.minWeight;

				let lastDir = 0;
				let startPos = isRow ? e.pageX : e.pageY;
				let lastWeights = $state.snapshot(tile.weights);
				let previousPos = startPos;
				let remaining = 0;
				const shrink = (j: number) => {
					const currentWeight = lastWeights[j];
					if (currentWeight > minWeight) {
						const available = currentWeight - minWeight;
						if (available > remaining) {
							tile.weights[j] = currentWeight - remaining;
							remaining = 0;
						} else {
							tile.weights[j] = minWeight;
							remaining -= available;
						}
					}
				};
				return {
					onMove(e) {
						const currentPos = isRow ? e.pageX : e.pageY;
						let currentDir = Math.sign(currentPos - previousPos);
						if (currentDir === 0) {
							return;
						}
						const resizerRect = resizerEl.getBoundingClientRect();
						if (
							isRow
								? currentDir < 0
									? currentPos < resizerRect.right
									: currentPos > resizerRect.left
								: currentDir < 0
									? currentPos < resizerRect.bottom
									: currentPos > resizerRect.top
						) {
							if (currentDir !== lastDir) {
								startPos = previousPos;
								lastWeights = $state.snapshot(tile.weights);
								lastDir = currentDir;
							}
							const deltaWeight = Math.abs(((currentPos - startPos) * totalWeight) / containerSize);
							if (deltaWeight > 0) {
								remaining = deltaWeight;
								if (currentDir < 0) {
									let j = i - 1;
									while (j >= 0 && remaining > 0) {
										shrink(j);
										j--;
									}
									tile.weights[i] = lastWeights[i] + deltaWeight - remaining;
								} else {
									let j = i;
									while (j < l && remaining > 0) {
										shrink(j);
										j++;
									}
									tile.weights[i - 1] = lastWeights[i - 1] + deltaWeight - remaining;
								}
							}
						}
						previousPos = currentPos;
					},
					onUp() {
						for (let j = 0; j < tile.weights.length; j++) {
							tile.weights[j] = Number.parseFloat(tile.weights[j].toFixed(2));
						}
					}
				};
			})
		}}
		<div class="item" style="--grow: {tile.weights[i]}">
			{#if i > 0}
				{@render resizer(resizerProps, tile, i)}
			{/if}
			<Component bind:tile={tile.children[i] as never} />
		</div>
	{/each}
</div>

<style>
	.split {
		display: flex;
		overflow: hidden;
		gap: var(--gap);

		.item {
			position: relative;
			flex: var(--grow) 1 0;
		}

		.resizer {
			position: absolute;
		}

		&[data-dir='row'] {
			flex-direction: row;
		}
		&[data-dir='column'] {
			flex-direction: column;
		}
	}
</style>
