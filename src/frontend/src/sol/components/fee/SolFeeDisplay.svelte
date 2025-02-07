<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';

	const {
		feeStore: fee,
		ataFeeStore: ataFee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish($fee) && nonNullish($decimals) && nonNullish($symbol)}
		{formatToken({
			value: BigNumber.from($fee),
			unitName: $decimals,
			displayDecimals: $decimals
		})}
		{$symbol}
	{/if}
</Value>

{#if nonNullish($ataFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="ataFee">
			<svelte:fragment slot="label">{$i18n.fee.text.ata_fee}</svelte:fragment>

			{#if nonNullish($decimals) && nonNullish($symbol)}
				{formatToken({
					value: BigNumber.from($ataFee),
					unitName: $decimals,
					displayDecimals: $decimals
				})}
				{$symbol}
			{/if}
		</Value>
	</div>
{/if}
