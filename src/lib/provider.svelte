<script lang="ts">
  import type { Snippet } from 'svelte';

  const {
    setContext,
    children,
  }: { setContext: () => void; children: Snippet } = $props();

  // svelte-ignore state_referenced_locally
  setContext();
</script>

{@render children()}
