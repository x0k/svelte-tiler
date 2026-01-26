<script lang="ts" module>
  import type { Component } from 'svelte';

  import Folder from '~icons/codicon/folder';
  import FolderOpen from '~icons/codicon/folder-opened';

  import MaterialIconThemeFolderLib from '~icons/material-icon-theme/folder-lib';
  import MaterialIconThemeFolderLibOpen from '~icons/material-icon-theme/folder-lib-open';

  import MaterialIconThemeFolderDocs from '~icons/material-icon-theme/folder-docs';
  import MaterialIconThemeFolderDocsOpen from '~icons/material-icon-theme/folder-docs-open';

  import MaterialIconThemeFolderShared from '~icons/material-icon-theme/folder-shared';
  import MaterialIconThemeFolderSharedOpen from '~icons/material-icon-theme/folder-shared-open';

  import MaterialIconThemeFolderUi from '~icons/material-icon-theme/folder-ui';
  import MaterialIconThemeFolderUiOpen from '~icons/material-icon-theme/folder-ui-open';

  const icons: Record<string, [Component, Component]> = {
    lib: [MaterialIconThemeFolderLib, MaterialIconThemeFolderLibOpen],
    docs: [MaterialIconThemeFolderDocs, MaterialIconThemeFolderDocsOpen],
    shared: [MaterialIconThemeFolderShared, MaterialIconThemeFolderSharedOpen],
    tiles: [MaterialIconThemeFolderUi, MaterialIconThemeFolderUiOpen]
  };
  const defaultIcons = [Folder, FolderOpen];
</script>

<script lang="ts">
  const { name, open }: { name: string; open: boolean } = $props();

  const Icon = $derived((icons[name] ?? defaultIcons)[open ? 1 : 0]);
</script>

<Icon />
