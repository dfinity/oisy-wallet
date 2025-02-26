<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';

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

				fee = $maxGasFee.toBigInt();
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
		<Html slot="label" text={$i18n.fee.text.convert_fee} />
	</FeeDisplay>
{/if}
