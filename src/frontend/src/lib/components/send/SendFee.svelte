<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import type { FeeData } from '@ethersproject/providers';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { ETH_BASE_FEE } from '$lib/constants/eth.constants';
	import { onDestroy } from 'svelte';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import { formatEther } from 'ethers/src.ts/utils';

	export let feeData: FeeData | undefined;

	let fee: BigNumber | undefined | null = undefined;

	let timer: NodeJS.Timeout | undefined;

	$: feeData,
		(() => {
			fee = undefined;

			if (isNullish(feeData) || isNullish(feeData?.maxFeePerGas)) {
				return;
			}

			const calculateFee = () => {
				if (isNullish(feeData) || isNullish(feeData?.maxFeePerGas)) {
					return;
				}

				// TODO: gas as param
				fee = feeData.maxFeePerGas.mul(BigNumber.from(`${ETH_BASE_FEE}`));
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
