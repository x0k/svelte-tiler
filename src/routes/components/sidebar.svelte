<script>
	import DocsFolder from '../icons/docs-folder.svelte';
	import Github from '../icons/github.svelte';
	import LibFolder from '../icons/lib-folder.svelte';
	import Markdown from '../icons/markdown.svelte';
	import Svelte from '../icons/svelte.svelte';
</script>

<div class="sidebar" data-theme="dark">
	<div class="sidebar-header">
		<span class="title">svelte-tiler</span>

		<div class="actions">
			<a class="icon-link" href="https://github.com/x0k/svelte-tiler" target="_blank">
				<Github />
			</a>
		</div>
	</div>

	<div class="explorer">
		<div class="item folder open">
			<DocsFolder />
			<span class="label">docs</span>
		</div>
		<div class="item file indent">
			<Markdown />
			<span class="label">foo.md</span>
		</div>

		<div class="item folder open">
			<LibFolder />
			<span class="label">lib</span>
		</div>

		<div class="item file indent">
			<Svelte />
			<span class="label">foo.svelte</span>
		</div>

		<div class="item file active">
			<Markdown />
			<span class="label">README.md</span>
		</div>
	</div>
</div>

<style>
	.sidebar {
		width: 100%;
		height: 100%;
		background: var(--color-surface);
		color: var(--color-text);
		font-family: system-ui, sans-serif;
		font-size: 11pt;
	}

	/* Header */

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 8px 6px 12px;
		color: var(--color-text-muted);
	}

	.sidebar-header .title {
		text-transform: uppercase;
		font-weight: normal;
		letter-spacing: 0.04em;
	}

	.actions {
		display: flex;
		gap: 2px;
	}

	.icon-link {
		all: unset; /* resets all inherited and browser-default styles */
		display: inline-flex; /* so you can center/align icons */
		cursor: pointer;
	}

	.icon-link :global(svg) {
		display: block; /* remove inline spacing issues */
		width: 1em; /* adjust icon size */
		height: 1em;
	}

	/* Explorer */

	.explorer {
		padding: 4px 0;
	}

	/* Items */

	.item {
		padding: 4px 18px;
		cursor: pointer;
		white-space: nowrap;

		/* REQUIRED for icons */
		display: flex;
		align-items: center;
		gap: 6px;

		color: inherit;
	}

	.item:hover {
		background: var(--color-surface-hover);
	}

	/* Icons inside items (unplugin-icons / codicons) */

	.item :global(svg) {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: currentColor;
	}

	/* Label text */

	.item .label {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Folder / file */

	.folder {
		color: var(--color-text);
	}

	.file {
		color: var(--color-text);
	}

	/* Active file (text + icon) */

	.file.active {
		background: var(--color-surface-alt);
		color: #fff;
	}

	/* Visual nesting only */

	.indent {
		padding-left: 36px;
	}
</style>
