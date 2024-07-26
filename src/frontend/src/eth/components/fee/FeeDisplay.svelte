<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { getContext, onDestroy } from 'svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import type { FeeContext } from '$eth/stores/fee.store';
	import { FEE_CONTEXT_KEY } from '$eth/stores/fee.store';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { slide } from 'svelte/transition';

	const { maxGasFee, feeSymbolStore, feeIdStore }: FeeContext =
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

	const balance = nonNullish($feeIdStore)
		? $balancesStore?.[$feeIdStore]?.data ?? BigNumber.from(0n)
		: BigNumber.from(0n);

	let insufficientFeeFunds = false;
	$: insufficientFeeFunds = nonNullish(fee) && balance.lt(fee);
</script>

<label for="balance" class="font-bold px-4.5"
	>Max fee <small>(likely in &lt; 30 seconds)</small>:</label
>
<div id="balance" class="font-normal px-4.5 mb-4 break-all min-h-10">
	{#if nonNullish(fee)}
		<div transition:fade>
			{formatToken({
				value: fee,
				displayDecimals: EIGHT_DECIMALS
			})}
			{$feeSymbolStore ?? ''}
			{#if insufficientFeeFunds}
				<p transition:slide={{ duration: 250 }} class="text-cyclamen text-xs">
					{$i18n.send.assertion.insufficient_ethereum_funds_to_cover_the_fees}
				</p>
			{/if}
		</div>
	{/if}
</div>
