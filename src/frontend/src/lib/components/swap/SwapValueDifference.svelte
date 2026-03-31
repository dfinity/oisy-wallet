<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import {
		SWAP_VALUE_DIFFERENCE_WARNING_VALUE,
		SWAP_VALUE_DIFFERENCE_ERROR_VALUE
	} from '$lib/constants/swap.constants';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import { calculateValueDifference } from '$lib/utils/swap.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		iconPosition?: 'right' | 'left';
	}

	let { swapAmount, receiveAmount, iconPosition = 'right' }: Props = $props();

	const { sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let valueDifference = $derived(
		calculateValueDifference({
			swapAmount,
			receiveAmount,
			sourceTokenExchangeRate: $sourceTokenExchangeRate,
			destinationTokenExchangeRate: $destinationTokenExchangeRate
		})
	);

	let isError = $derived(
		nonNullish(valueDifference) && valueDifference <= SWAP_VALUE_DIFFERENCE_ERROR_VALUE
	);

	let isWarning = $derived(
		nonNullish(valueDifference) &&
			valueDifference <= SWAP_VALUE_DIFFERENCE_WARNING_VALUE &&
			valueDifference > SWAP_VALUE_DIFFERENCE_ERROR_VALUE
	);

	let isSuccess = $derived(
		nonNullish(valueDifference) && valueDifference > SWAP_VALUE_DIFFERENCE_WARNING_VALUE
	);

	let showWarningIcon = $derived(isWarning || isError);
</script>

{#snippet valueDifferenceWarningIcon()}
	<span>⚠</span>
{/snippet}

{#if nonNullish(valueDifference)}
	<span
		class="inline-flex items-center gap-1"
		class:font-bold={isWarning || isError}
		class:text-error-primary={isError}
		class:text-success-primary={isSuccess}
		class:text-warning-primary={isWarning}
		class:gap-2={iconPosition === 'left'}
	>
		{#if showWarningIcon && iconPosition === 'left'}
			{@render valueDifferenceWarningIcon()}
		{/if}
		<span>
			{`${valueDifference > 0 ? '+' : ''}${valueDifference.toFixed(2)}`}%
		</span>
		{#if showWarningIcon && iconPosition === 'right'}
			{@render valueDifferenceWarningIcon()}
		{/if}
	</span>
{/if}
