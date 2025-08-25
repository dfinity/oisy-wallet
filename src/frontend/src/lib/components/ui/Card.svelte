<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import CardAmountDescription from '$lib/components/ui/CardAmountDescription.svelte';

	interface Props {
		icon: Snippet;
		description?: Snippet;
		amount?: Snippet;
		amountDescription?: Snippet;
		action?: Snippet;
		children?: Snippet;
		noMargin?: boolean;
		testId?: string;
	}

	let {
		icon,
		description,
		amount,
		amountDescription,
		action,
		children,
		noMargin = false,
		testId
	}: Props = $props();
</script>

<div class="flex items-center gap-4" class:mb-6={!noMargin} data-tid={testId}>
	{@render icon()}

	<div class="flex flex-1 flex-col justify-center">
		<div class="flex gap-1 font-bold leading-5" class:items-center={isNullish(description)}>
			<span
				style={nonNullish(amount) ? 'max-width: 60%' : undefined}
				class="clamp-4 inline-flex items-center text-left">{@render children?.()}</span
			>

			{#if nonNullish(amount)}
				<CardAmount>{@render amount()}</CardAmount>
			{/if}
		</div>
		<div class="flex gap-1 text-tertiary" class:items-center={isNullish(description)}>
			<span class="inline-flex items-center text-left">
				{@render description?.()}
			</span>

			{#if nonNullish(amountDescription)}
				<CardAmountDescription>{@render amountDescription()}</CardAmountDescription>
			{/if}
		</div>
	</div>
	{#if nonNullish(action)}
		<div class="flex min-w-14 shrink">
			{@render action()}
		</div>
	{/if}
</div>
