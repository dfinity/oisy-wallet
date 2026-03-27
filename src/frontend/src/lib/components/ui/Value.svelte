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

<label class="font-bold" for={ref}>{@render label()}</label>

<svelte:element this={element} id={ref} class="mb-4 font-normal break-all">
	{@render content?.()}
</svelte:element>
