<script>
	import DocsFolder from '../icons/docs-folder.svelte';
	import Github from '../icons/github.svelte';
	import Markdown from '../icons/markdown.svelte';
</script>

<div class="sidebar" data-theme="dark">
	<div class="sidebar-header">
		<span class="title">SVELTE-TILER</span>

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
		font-size: 10.5pt;
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
		font-weight: 600;
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

	.icon-link svg {
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
		padding: 4px 12px;
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
		padding-left: 28px;
	}
</style>
