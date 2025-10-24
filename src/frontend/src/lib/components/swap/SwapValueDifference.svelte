<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import {
		SWAP_VALUE_DIFFERENCE_WARNING_VALUE,
		SWAP_VALUE_DIFFERENCE_ERROR_VALUE
	} from '$lib/constants/swap.constants';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
	}

	let { swapAmount, receiveAmount }: Props = $props();

	const { sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let paidValue = $derived(
		nonNullish(swapAmount) && nonNullish($sourceTokenExchangeRate)
			? Number(swapAmount) * $sourceTokenExchangeRate
			: undefined
	);

	let receivedValue = $derived(
		nonNullish(receiveAmount) && nonNullish($destinationTokenExchangeRate)
			? receiveAmount * $destinationTokenExchangeRate
			: undefined
	);

	let valueDifference = $derived(
		nonNullish(paidValue) && nonNullish(receivedValue) && paidValue !== 0
			? ((receivedValue - paidValue) / paidValue) * 100
			: undefined
	);
</script>

{#if nonNullish(valueDifference)}
	<span
		class="underline"
		class:text-error-primary={valueDifference <= SWAP_VALUE_DIFFERENCE_ERROR_VALUE}
		class:text-success-primary={valueDifference > SWAP_VALUE_DIFFERENCE_WARNING_VALUE}
		class:text-warning-primary={valueDifference <= SWAP_VALUE_DIFFERENCE_WARNING_VALUE &&
			valueDifference > SWAP_VALUE_DIFFERENCE_ERROR_VALUE}
	>
		{`${valueDifference > 0 ? '+' : ''}${valueDifference.toFixed(2)}`}%
	</span>
{/if}
