<script lang="ts">
	import { getContext } from 'svelte';
	import ValueDifference from '$lib/components/ui/ValueDifference.svelte';
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
</script>

<ValueDifference
	errorLevel={SWAP_VALUE_DIFFERENCE_ERROR_VALUE}
	{iconPosition}
	value={valueDifference}
	warningLevel={SWAP_VALUE_DIFFERENCE_WARNING_VALUE}
/>
