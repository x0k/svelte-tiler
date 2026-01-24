<script lang="ts" module>
  import MaterialIconThemeTypescript from '~icons/material-icon-theme/typescript';
  import MaterialIconThemeSvelte from '~icons/material-icon-theme/svelte';
  import MaterialIconThemeMarkdown from '~icons/material-icon-theme/markdown';
  import CodiconFile from '~icons/codicon/file';

  const icons = {
    ts: MaterialIconThemeTypescript,
    svelte: MaterialIconThemeSvelte,
    md: MaterialIconThemeMarkdown,
  };

  type IconType = keyof typeof icons;
</script>

<script lang="ts">
  const { extension }: { extension: string } = $props();

  const Icon = $derived(icons[extension as IconType] ?? CodiconFile);
</script>

<Icon />
