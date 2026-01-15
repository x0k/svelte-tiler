<script lang="ts">
	import Split, { createColumn, createRow } from '$lib/tiles/split.svelte';
	import Leaf, { setupLeafs } from '$lib/tiles/leaf.svelte';
	import Tabs, { createTabs } from '$lib/tiles/tabs.svelte';
	import Tiler from '$lib/tiler.svelte';

	const leaf = setupLeafs({
		foo,
		bar
	});
	let tile = $state(
		createRow(
			createTabs({
				tabs: [
					['foo', leaf('foo')],
					['bar', leaf('bar')],
					['baz', leaf('foo')]
				]
			})
		)
	);
</script>

<div class="tiler h-screen w-full">
	<Tiler bind:tile components={{ split: Split, leaf: Leaf, tabs: Tabs }} />
</div>

{#snippet foo()}
	<p>Foo</p>
{/snippet}

{#snippet bar()}
	<p>Bar</p>
{/snippet}

<style>
	:global .tiler {
		.split {
			--resizer-line-size: 1px;
			--resizer-hit-size: 12px;
			--resizer-color: #888;

			gap: var(--resizer-line-size);

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
			width: 100%;
			height: 100%;
			display: flex;
			flex-direction: column;
			> .tab-bar {
				display: flex;
				flex-direction: row;
				> .tab-header {
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 0.4rem 0.8rem;
				}
			}
			> .tab-content {
				flex-grow: 1;
			}
		}
	}
</style>
