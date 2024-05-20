<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { getContext, onDestroy } from 'svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import type { FeeContext } from '$eth/stores/fee.store';
	import { FEE_CONTEXT_KEY } from '$eth/stores/fee.store';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';

	const { maxGasFee, feeSymbolStore }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let fee: BigNumber | undefined | null = undefined;

	let timer: NodeJS.Timeout | undefined;

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
<div id="balance" class="font-normal px-4.5 mb-4 break-all" style="min-height: 24px">
	{#if nonNullish(fee)}
		<div in:fade>
			{formatToken({
				value: fee,
				displayDecimals: EIGHT_DECIMALS
			})}
			{$feeSymbolStore ?? ''}
		</div>
	{/if}
</div>
