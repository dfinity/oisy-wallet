<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		testId?: string;
	}

	let { children, testId }: Props = $props();
</script>

<div class="mb-2 flex w-full gap-3" data-tid={testId}>
	{@render children?.()}
</div>
