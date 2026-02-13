<script lang="ts" generics="T">
  import { setContext, type Snippet } from 'svelte';

  const { key, value, children }: { key: symbol; value: T; children: Snippet } =
    $props();

  // svelte-ignore state_referenced_locally
  setContext(key, value);
</script>

{@render children()}
