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
	}

	let { swapAmount, receiveAmount }: Props = $props();

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
