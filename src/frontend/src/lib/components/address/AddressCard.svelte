<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		logo?: Snippet;
		content: Snippet;
		actions?: Snippet;
		variant?: 'default' | 'info';
		hasError?: boolean;
		items?: 'start' | 'center' | 'end';
	}

	const {
		logo,
		content,
		actions,
		variant = 'default',
		hasError = false,
		items = 'start'
	}: Props = $props();
</script>

<div
	class={`flex rounded-lg border border-disabled bg-secondary px-2 py-3 items-${items}`}
	class:border-error-solid={hasError}
	class:bg-secondary={variant === 'default'}
	class:border-disabled={variant === 'default'}
	class:bg-brand-subtle-10={variant === 'info'}
	class:border-brand-subtle-10={variant === 'info'}
>
	<div class="flex flex-shrink-0">
		{@render logo?.()}
	</div>

	<div class="flex w-full flex-col truncate pl-2 pr-4 text-sm sm:text-base">
		{@render content()}
	</div>

	<div class="flex">
		{@render actions?.()}
	</div>
</div>
