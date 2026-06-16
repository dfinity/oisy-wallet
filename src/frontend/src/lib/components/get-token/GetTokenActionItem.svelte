<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon: Snippet;
		title: Snippet;
		description: Snippet;
		button: Snippet;
	}

	let { icon, title, description, button }: Props = $props();
</script>

<div class="border-disabled flex items-start justify-between rounded-xl border-1 border-solid p-3">
	<div class="text-brand-primary">
		{@render icon()}
	</div>

	<div class="mx-2 flex w-full flex-col gap-0.5 sm:mx-4">
		<span class="text-sm font-bold sm:text-base">{@render title()}</span>
		<span class="text-tertiary text-xs sm:text-sm">{@render description()}</span>
	</div>

	<div class="xs:shrink-0 flex">
		{@render button()}
	</div>
</div>
