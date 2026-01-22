<div class="sidebar" data-theme="dark">
	<div class="sidebar-header">
		<span class="title">SVELTE-TILER</span>

		<div class="actions">
			<button title="New File">+</button>
		</div>
	</div>

	<div class="explorer">
		<div class="item folder">.direnv</div>
		<div class="item folder">.svelte-kit</div>
		<div class="item folder">.vscode</div>
		<div class="item folder">e2e</div>
		<div class="item folder">node_modules</div>

		<div class="item folder open">src</div>

		<div class="item file active indent">app.html</div>
		<div class="item file indent">app.ts</div>
		<div class="item file indent">routes.ts</div>
	</div>
</div>

<style>
	.sidebar {
		width: 100%;
		height: 100%;
		background: var(--color-surface);
		color: var(--color-text);
		font-family: system-ui, sans-serif;
		font-size: 13px;
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

	.actions button {
		background: none;
		border: none;
		color: var(--color-text-muted);
		width: 24px;
		height: 24px;
		cursor: pointer;
	}

	.actions button:hover {
		background: var(--color-surface-alt);
		color: var(--color-text);
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
	}

	.item:hover {
		background: var(--color-surface-alt);
	}

	.folder {
		color: var(--color-text);
	}

	.file {
		color: var(--color-text);
	}

	.file.active {
		background: rgba(10, 132, 255, 0.28);
		color: #fff;
	}

	/* Visual nesting only */

	.indent {
		padding-left: 28px;
	}
</style>
