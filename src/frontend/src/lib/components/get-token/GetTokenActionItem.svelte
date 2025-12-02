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

<div class="flex items-start justify-between rounded-xl border-1 border-solid border-disabled p-3">
	<div class="text-brand-primary">
		{@render icon()}
	</div>

	<div class="mx-2 flex w-full flex-col gap-0.5 sm:mx-4">
		<span class="text-sm font-bold sm:text-base">{@render title()}</span>
		<span class="text-xs text-tertiary sm:text-sm">{@render description()}</span>
	</div>

	<div class="flex xs:shrink-0">
		{@render button()}
	</div>
</div>
