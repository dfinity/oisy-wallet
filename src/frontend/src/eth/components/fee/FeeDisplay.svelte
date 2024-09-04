<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import FeeAmountDisplay from '$icp-eth/components/fee/FeeAmountDisplay.svelte';

	const { maxGasFee, feeSymbolStore, feeTokenIdStore, feeDecimalsStore }: FeeContext =
		getContext<FeeContext>(FEE_CONTEXT_KEY);

	let fee: BigNumber | undefined | null = undefined;

	let timer: NodeJS.Timeout | undefined;

	// The time is used to animate the UI - i.e. displays a fade animation each time the fee is updated
	$: $maxGasFee,
		(() => {
			fee = undefined;

			if (isNullish($maxGasFee)) {
				return;
			}

			const calculateFee = () => {
				if (isNullish($maxGasFee)) {
					return;
				}

				fee = $maxGasFee;
			};

			timer = setTimeout(calculateFee, 500);
		})();

	onDestroy(() => {
		if (isNullish(timer)) {
			return;
		}

		clearTimeout(timer);
	});
</script>

<label for="balance" class="font-bold px-4.5"
	>Max fee <small>(likely in &lt; 30 seconds)</small>:</label
>
<div id="balance" class="font-normal px-4.5 mb-4 break-all min-h-6">
	{#if nonNullish(fee) && nonNullish($feeSymbolStore) && nonNullish($feeTokenIdStore) && nonNullish($feeDecimalsStore)}
		<FeeAmountDisplay
			{fee}
			feeSymbol={$feeSymbolStore}
			feeTokenId={$feeTokenIdStore}
			feeDecimals={$feeDecimalsStore}
		/>
	{/if}
</div>
