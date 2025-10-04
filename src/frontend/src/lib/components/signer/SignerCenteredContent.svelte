<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="flex min-h-full flex-1 flex-col items-center justify-center gap-3">
	{@render children?.()}
</div>
