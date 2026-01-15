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
		withGap?: boolean;
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
		withGap = false,
		testId
	}: Props = $props();
</script>

<div class="flex min-w-0 items-center gap-4" class:mb-6={!noMargin} data-tid={testId}>
	{@render icon()}

	<div class="flex min-w-0 flex-1 flex-col justify-center" class:gap-1={withGap}>
		<div
			class="flex min-w-0 items-center gap-2 text-left leading-5 font-bold"
			class:items-center={isNullish(description)}
		>
			{@render children?.()}

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
