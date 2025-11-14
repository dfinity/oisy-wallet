<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		logo: Snippet;
		badge: Snippet;
		title: Snippet;
		description: Snippet;
		button: Snippet;
	}

	const { logo, badge, title, description, button }: Props = $props();
</script>

<div class="flex flex-col rounded-lg border-1 border-disabled bg-disabled p-4">
	<div class="mb-3 flex flex-1 flex-col gap-3 text-sm">
		<span class="flex items-start">
			<span class="flex flex-1">{@render logo()}</span>
			<span
				class="flex min-h-0 flex-0 grow-0 rounded-full border-1 border-tertiary bg-primary px-3 py-1 text-xs whitespace-nowrap"
				>{@render badge()}</span
			>
		</span>

		<h3>{@render title()}</h3>

		<span>{@render description()}</span>
	</div>

	<span>{@render button()}</span>
</div>
