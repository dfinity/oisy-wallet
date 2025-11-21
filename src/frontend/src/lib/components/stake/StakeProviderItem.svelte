<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	interface Props {
		icon: Snippet;
		title: Snippet;
		description: Snippet;
	}

	const { icon, title, description }: Props = $props();
</script>

<div class="flex border-b-1 border-secondary py-3" transition:slide>
	{@render icon()}

	<div class="ml-3 w-full text-sm">
		<div class="font-bold">
			{@render title()}
		</div>

		<div class="mt-1 text-tertiary">
			{@render description()}
		</div>
	</div>
</div>
