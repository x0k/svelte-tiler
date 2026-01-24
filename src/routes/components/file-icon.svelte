<script lang="ts">
	import VscodeIconsFileTypeTypescript from '~icons/vscode-icons/file-type-typescript';
	import VscodeIconsFileTypeSvelte from '~icons/vscode-icons/file-type-svelte';
	import VscodeIconsFileTypeMarkdown from '~icons/vscode-icons/file-type-markdown';
	import FileIcon from '~icons/vscode-icons/file-type-text';

	const icons = {
		ts: VscodeIconsFileTypeTypescript,
		svelte: VscodeIconsFileTypeSvelte,
		md: VscodeIconsFileTypeMarkdown
	};

	type IconType = keyof typeof icons;

	const { extension }: { extension: IconType | (string & {}) } = $props();

	const Icon = $derived(icons[extension as IconType] ?? FileIcon);
</script>

<Icon />
