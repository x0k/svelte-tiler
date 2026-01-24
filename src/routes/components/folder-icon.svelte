<script lang="ts" module>
	import Folder from '~icons/codicon/folder';
	import FolderOpen from '~icons/codicon/folder-opened';

	import MaterialIconThemeFolderLib from '~icons/material-icon-theme/folder-lib';
	import MaterialIconThemeFolderLibOpen from '~icons/material-icon-theme/folder-lib-open';

	import MaterialIconThemeFolderDocs from '~icons/material-icon-theme/folder-docs';
	import MaterialIconThemeFolderDocsOpen from '~icons/material-icon-theme/folder-docs-open';
	import type { Component } from 'svelte';

	const icons: Record<string, [Component, Component]> = {
		lib: [MaterialIconThemeFolderLib, MaterialIconThemeFolderLibOpen],
		docs: [MaterialIconThemeFolderDocs, MaterialIconThemeFolderDocsOpen]
	};
	const defaultIcons = [Folder, FolderOpen];
</script>
<script lang="ts">
	const { name, open }: { name: string; open: boolean } = $props();

	const Icon = $derived((icons[name] ?? defaultIcons)[open ? 1 : 0]);
</script>

<Icon />
