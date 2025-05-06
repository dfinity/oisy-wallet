<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: Snippet;
		content: Snippet;
		ref?: string;
		element?: 'p' | 'div';
	}

	let { label, content, ref, element = 'p' }: Props = $props();
</script>

<label for={ref} class="font-bold">{@render label()}</label>
<svelte:element this={element} id={ref} class="mb-4 break-all font-normal"
	>{@render content?.()}</svelte:element
>
