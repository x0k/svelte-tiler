<script lang="ts">
	import { fromConstant } from '$lib/shared/registry.js';
	import type { Tiles } from '$lib/tile.js';
	import { createTilerContext, setTilerContext } from '$lib/context.js';
	import Split, { createColumn, createRow, createSplit } from '$lib/tiles/split.svelte';
	import Leaf, { setupLeafs } from '$lib/tiles/leaf.svelte';
	import Tabs, { createTabs } from '$lib/tiles/tabs.svelte';
	import Panel from '$lib/panel.svelte';

	setTilerContext(
		createTilerContext({
			components: { split: Split, leaf: Leaf, tabs: Tabs }
		})
	);

	const leaf = setupLeafs(fromConstant(test));
	let split = $state(
		createSplit({
			children: [leaf('foo'), leaf('bar'), createColumn(leaf('foo'), leaf('bar'))],
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
		createRow(
			createTabs({
				tabs: [
					['foo', leaf('foo')],
					['bar', leaf('bar')],
					['baz', leaf('baz')]
				]
			})
		)
	);
</script>

<div class="mx-auto flex w-full max-w-200 flex-col gap-4 p-4">
	<div class="tiler h-100 rounded-md border">
		<Panel bind:layout={split} />
	</div>
	<div class="tiler h-100 rounded-md border">
		<Panel bind:layout={tabs} />
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
