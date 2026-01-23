<script lang="ts">
	import { marked } from 'marked';

	import readmeMd from '../../README.md?raw';

	import { fromRecord } from '$lib/shared/registry.js';
	import { Tiler, type Tiles } from '$lib/index.js';
	import * as Split from '$lib/tiles/split.svelte';
	import * as Leaf from '$lib/tiles/leaf.svelte';
	import * as Tabs from '$lib/tiles/tabs.svelte';

	import Sidebar from './sidebar.svelte';

	const leaf = Leaf.setup(
		fromRecord({
			sidebar,
			content
		})
	);
	const createTabs = Tabs.setup({
		createSplit({ parent, type, pivot, adjacent, offset }) {
			if (parent?.type === 'split' && parent.direction === type) {
				const index = parent.children.findIndex((c) => c.id === pivot.id);
				parent.children.splice(index + offset, 0, adjacent);
				parent.constraints.splice(index + offset, 0, { weight: 1, minWeight: 0.2, maxWeight: 0 });
				return parent;
			}
			const tiles = new Array<Tiles['tabs']>(2);
			tiles[1 - offset] = pivot;
			tiles[offset] = adjacent;
			const next = (type === 'row' ? Split.createRow : Split.createColumn).apply(Split, tiles);
			if (parent && parent.children.length > 1) {
				const index = parent.children.findIndex((c) => c.id === pivot.id);
				parent.children[index] = next;
				return parent;
			}
			return next;
		}
	});
	let tile = $state(
		Split.create({
			direction: 'row',
			children: [
				leaf('sidebar'),
				createTabs({
					tabs: [['Content', leaf('content')]]
				})
			],
			constraints: [{ minWeight: 0.15, weight: 0.2, maxWeight: 0.3 }, {}]
		})
	);
</script>

<div class="h-screen w-full">
	<Tiler bind:tile tiles={{ split: Split, leaf: Leaf, tabs: Tabs }} />
</div>

{#snippet sidebar()}
	<Sidebar />
{/snippet}

{#snippet content()}
	<div class="content">
		{@html marked.parse(readmeMd)}
	</div>
{/snippet}

<style>
	:global {
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
