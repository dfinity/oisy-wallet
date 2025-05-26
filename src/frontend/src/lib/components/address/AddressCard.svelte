<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		logo?: Snippet;
		content: Snippet;
		actions?: Snippet;
		hasError?: boolean;
		items?: 'start' | 'center' | 'end';
	}

	const { logo, content, actions, hasError = false, items = 'start' }: Props = $props();
</script>

<div
	class={`flex rounded-lg border border-disabled bg-secondary px-2 py-3 items-${items}`}
	class:border-error-solid={hasError}
>
	{@render logo?.()}

	<div class="flex w-full flex-col truncate pl-2 pr-4 text-sm sm:text-base">
		{@render content()}
	</div>

	{@render actions?.()}
</div>
