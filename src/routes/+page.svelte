<script lang="ts">
	import { fromConstant } from '$lib/shared/registry.js';
	import type { Tiles } from '$lib/model.js';
	import { createTilerContext, setTilerContext } from '$lib/context.js';
	import * as Split from '$lib/tiles/split.svelte';
	import * as Leaf from '$lib/tiles/leaf.svelte';
	import * as Tabs from '$lib/tiles/tabs.svelte';
	import Panel from '$lib/panel.svelte';

	setTilerContext(
		createTilerContext({
			tiles: { split: Split, leaf: Leaf, tabs: Tabs }
		})
	);

	const leaf = Leaf.setupLeafs(fromConstant(test));
	const createTabs = Tabs.setupTabs({
		createSplit({ parent, index, type, tile, adjacent, offset }) {
			if (parent?.type === 'split' && parent.direction === type) {
				parent.children.splice(index + offset, 0, adjacent);
				parent.constraints.splice(index + offset, 0, { weight: 1, minWeight: 0.2, maxWeight: 0 });
				return parent;
			}
			const tiles = new Array<Tiles['tabs']>(2);
			tiles[offset] = adjacent;
			tiles[1 - offset] = tile;
			return (type === 'row' ? Split.createRow : Split.createColumn).apply(Split, tiles);
		}
	});
	let split = $state(
		Split.createSplit({
			children: [leaf('foo'), leaf('bar'), Split.createColumn(leaf('foo'), leaf('bar'))],
			constraints: [
				{},
				{
					maxWeight: 1
				},
				{}
			]
		})
	);
	let tabs = $state(
		createTabs({
			tabs: [
				['foo', leaf('foo')],
				['bar', leaf('bar')],
				['baz', leaf('baz')]
			]
		})
	);
</script>

<div class="mx-auto flex w-full max-w-200 flex-col gap-4 p-4">
	<div class="tiler h-100 rounded-md border">
		<Panel bind:tile={split} />
	</div>
	<div class="tiler h-100 rounded-md border">
		<Panel bind:tile={tabs} />
	</div>
</div>

{#snippet test(tile: Tiles['leaf'])}
	<p>{tile.name}</p>
{/snippet}

<style>
	:global .tiler {
		.split {
			--resizer-line-size: 1px;
			--resizer-hit-size: 12px;
			--resizer-color: #888;

			width: 100%;
			height: 100%;
			.resizer {
				z-index: 10;
				inset: 0;

				&::before {
					content: '';
					position: absolute;
					inset: 0;
					background: var(--resizer-color);
					opacity: 0.5;
				}

				&:hover {
					&::before {
						background-color: black;
						opacity: 1;
					}
				}
			}

			&[data-dir='row'] {
				> .item {
					> .resizer {
						cursor: col-resize;
						width: var(--resizer-hit-size);
						transform: translateX(calc(-50% - var(--resizer-line-size) / 2));

						&::before {
							left: 50%;
							width: var(--resizer-line-size);
							transform: translateX(-50%);
						}
					}
				}
			}
			&[data-dir='column'] {
				> .item {
					> .resizer {
						cursor: row-resize;
						height: var(--resizer-hit-size);
						transform: translateY(calc(-50% - var(--resizer-line-size) / 2));

						&::before {
							top: 50%;
							height: var(--resizer-line-size);
							transform: translateY(-50%);
						}
					}
				}
			}
		}
		.tabs {
			--drop-indicator-color: rgba(0, 120, 215, 0.25);

			width: 100%;
			height: 100%;
			display: flex;
			flex-direction: column;
			.tab-bar {
				display: flex;
				flex-direction: row;
				.tab-header {
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 0.4rem 0.8rem;
				}
			}
			.tab-content {
				flex-grow: 1;
				position: relative;
				overflow: hidden;
				&::after {
					content: '';
					position: absolute;
					pointer-events: none;
					background: var(--drop-indicator-color);
					transition: inset 160ms ease;
				}
				&[data-over='true'] {
					&::after {
						opacity: 1;
					}
					&[data-hpart='center'][data-vpart='center']::after {
						inset: 0;
					}

					&[data-hpart='start']::after {
						inset: 0 50% 0 0;
					}

					&[data-hpart='end']::after {
						inset: 0 0 0 50%;
					}

					&[data-hpart='center'][data-vpart='start']::after {
						inset: 0 0 50% 0;
					}

					&[data-hpart='center'][data-vpart='end']::after {
						inset: 50% 0 0 0;
					}
				}
			}
		}
	}
</style>
