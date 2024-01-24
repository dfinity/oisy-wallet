<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { nonNullish } from '@dfinity/utils';
	import { BTC_DECIMALS } from '$icp/constants/ckbtc.constants';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import Value from '$lib/components/ui/Value.svelte';
	import { getContext } from 'svelte';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';

	const { store: storeFeeData } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);

	let bitcoinEstimatedFee: bigint | undefined;
	$: bitcoinEstimatedFee = nonNullish($storeFeeData)
		? $storeFeeData.bitcoin_fee + $storeFeeData.minter_fee
		: undefined;
</script>

{#if nonNullish(bitcoinEstimatedFee)}
	<div transition:slide={{ easing: quintOut, axis: 'y' }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">Estimated BTC Network Fee</svelte:fragment>

			{formatToken({
				value: BigNumber.from(bitcoinEstimatedFee),
				unitName: BTC_DECIMALS,
				displayDecimals: BTC_DECIMALS
			})}
			BTC
		</Value>
	</div>
{/if}
