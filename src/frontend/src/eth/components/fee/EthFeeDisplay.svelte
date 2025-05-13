<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	const { maxGasFee, feeSymbolStore, feeDecimalsStore, feeExchangeRateStore }: FeeContext =
		getContext<FeeContext>(FEE_CONTEXT_KEY);

	let fee: bigint | undefined = undefined;

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

{#if nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore)}
	<FeeDisplay
		feeAmount={fee}
		decimals={$feeDecimalsStore}
		symbol={$feeSymbolStore}
		exchangeRate={$feeExchangeRateStore}
	>
		<slot slot="label" name="label" />
	</FeeDisplay>
{/if}
