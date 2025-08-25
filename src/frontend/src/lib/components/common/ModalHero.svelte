<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import type { ModalHeroVariant } from '$lib/types/style';

	interface Props {
		logo?: Snippet;
		title?: Snippet;
		subtitle?: Snippet;
		description?: Snippet;
		content?: Snippet;
		variant?: ModalHeroVariant;
	}

	const { logo, title, subtitle, description, content, variant = 'default' }: Props = $props();
</script>

<div
	class="mb-6 flex flex-col items-center justify-center rounded-lg border border-solid p-4"
	class:bg-brand-subtle-10={variant === 'default'}
	class:bg-success-subtle-20={variant === 'success'}
	class:border-brand-subtle-20={variant === 'default'}
	class:border-success-subtle-20={variant === 'success'}
>
	{#if nonNullish(logo)}
		<div class="mb-1.5">
			{@render logo()}
		</div>
	{/if}

	{#if nonNullish(subtitle)}
		<div class="mb-1 text-base font-bold">
			{@render subtitle()}
		</div>
	{/if}

	{#if nonNullish(title)}
		<div class="text-2xl font-bold">
			{@render title()}
		</div>
	{/if}

	{#if nonNullish(description)}
		<div class="text-sm text-tertiary">
			{@render description()}
		</div>
	{/if}

	{#if nonNullish(content)}
		<div class="mt-4 w-full">
			{@render content()}
		</div>
	{/if}
</div>
