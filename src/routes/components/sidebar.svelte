<script lang="ts">
  import GitHub from '~icons/codicon/github-inverted';
  import type { Snippet } from 'svelte';

  const {
    children,
  }: {
    children: Snippet;
  } = $props();
</script>

<div class="sidebar">
  <div class="sidebar-header">
    <span class="title">svelte-tiler</span>

    <div class="actions">
      <a
        class="icon-link"
        href="https://github.com/x0k/svelte-tiler"
        target="_blank"
      >
        <GitHub />
      </a>
    </div>
  </div>

  <div class="explorer" role="tree" tabindex="0">
    {@render children()}
  </div>
</div>
