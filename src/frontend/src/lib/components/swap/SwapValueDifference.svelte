<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import {
		SWAP_VALUE_DIFFERENCE_WARNING_VALUE,
		SWAP_VALUE_DIFFERENCE_ERROR_VALUE
	} from '$lib/constants/swap.constants';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';

	export let swapAmount: OptionAmount;
	export let receiveAmount: number | undefined;

	const { sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let paidValue: number | undefined;
	$: paidValue =
		nonNullish(swapAmount) && nonNullish($sourceTokenExchangeRate)
			? Number(swapAmount) * $sourceTokenExchangeRate
			: undefined;

	let receivedValue: number | undefined;
	$: receivedValue =
		nonNullish(receiveAmount) && nonNullish($destinationTokenExchangeRate)
			? receiveAmount * $destinationTokenExchangeRate
			: undefined;

	let valueDifference: number | undefined;
	$: valueDifference =
		nonNullish(paidValue) && nonNullish(receivedValue) && paidValue !== 0
			? ((receivedValue - paidValue) / paidValue) * 100
			: undefined;
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
