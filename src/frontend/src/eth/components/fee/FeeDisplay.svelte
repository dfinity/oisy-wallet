<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext, onDestroy } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import FeeAmountDisplay from '$icp-eth/components/fee/FeeAmountDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';

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

<label for="balance" class="font-bold px-4.5"><Html text={$i18n.fee.text.max_fee_eth} /></label>

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
