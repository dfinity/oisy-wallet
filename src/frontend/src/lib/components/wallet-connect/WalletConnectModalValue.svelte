<script lang="ts">
	import type { Snippet } from 'svelte';
	import Value from '$lib/components/ui/Value.svelte';

	interface Props {
		label: string;
		ref: string;
		children: Snippet;
	}

	let { label: labelStr, ref, children }: Props = $props();
</script>

<Value element="div" {ref}>
	{#snippet label()}
		{labelStr}
	{/snippet}

	{#snippet content()}
		{@render children()}
	{/snippet}
</Value>
