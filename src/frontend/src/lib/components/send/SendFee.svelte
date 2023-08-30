<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import type { FeeData } from '@ethersproject/providers';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';

	export let feeData: FeeData | undefined;

	let maxFeePerGas: BigNumber | undefined | null = undefined;

	$: feeData,
		(() => {
			maxFeePerGas = undefined;

			if (isNullish(feeData)) {
				return;
			}

			setTimeout(() => (maxFeePerGas = feeData?.maxFeePerGas), 500);
		})();
</script>

<label for="balance" class="font-bold px-1.25"
	>Max fee <small>(likely in &lt; 30 seconds)</small>:</label
>
<div id="balance" class="font-normal px-1.25 mb-2 break-words" style="min-height: 24px">
	{#if nonNullish(maxFeePerGas)}
		<div in:fade>
			{maxFeePerGas.toString()}
		</div>
	{/if}
</div>
