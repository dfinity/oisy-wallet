<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();

	interface Props {
		isActive?: boolean;
		label: string;
		content?: Snippet;
	}

	let { isActive = false, label, content }: Props = $props();
</script>

<button
	class="mb-2 flex cursor-pointer items-center gap-2"
	aria-label={label}
	onclick={bubble('click')}
>
	<span
		class="h-4 w-4 rounded-full border-4 shadow-sm"
		class:bg-off-white={isActive}
		class:bg-primary={!isActive}
		class:border-brand-primary={isActive}
		class:border-primary-inverted={!isActive}
	></span>

	{label}
</button>

{#if isActive}
	{@render content?.()}
{/if}
