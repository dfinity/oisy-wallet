<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { getContext, onDestroy } from 'svelte';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import type { FeeContext } from '$lib/stores/fee.store';
	import { FEE_CONTEXT_KEY } from '$lib/stores/fee.store';

	const { store: feeData }: FeeContext = getContext<FeeContext>(FEE_CONTEXT_KEY);

	let fee: BigNumber | undefined | null = undefined;

	let timer: NodeJS.Timeout | undefined;

	$: $feeData,
		(() => {
			fee = undefined;

			if (isNullish($feeData) || isNullish($feeData?.maxFeePerGas)) {
				return;
			}

			const calculateFee = () => {
				if (isNullish($feeData) || isNullish($feeData?.maxFeePerGas)) {
					return;
				}

				fee = $feeData.maxFeePerGas.mul($feeData.gas);
			};

			timer = setTimeout(calculateFee, 500);
		})();

	onDestroy(() => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
	});
</script>

<label for="balance" class="font-bold px-1.25"
	>Max fee <small>(likely in &lt; 30 seconds)</small>:</label
>
<div id="balance" class="font-normal px-1.25 mb-2 break-words" style="min-height: 24px">
	{#if nonNullish(fee)}
		<div in:fade>
			{formatEtherShort(fee, 8)}
		</div>
	{/if}
</div>
