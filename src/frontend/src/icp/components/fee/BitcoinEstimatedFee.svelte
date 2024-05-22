<script lang="ts">
	import { slide } from 'svelte/transition';
	import { nonNullish } from '@dfinity/utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import Value from '$lib/components/ui/Value.svelte';
	import { getContext } from 'svelte';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import { BTC_DECIMALS } from '$env/tokens.btc.env';
	import { i18n } from '$lib/stores/i18n.store';

	const { store: storeFeeData } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);

	let bitcoinEstimatedFee: bigint | undefined;
	$: bitcoinEstimatedFee =
		nonNullish($storeFeeData) && nonNullish($storeFeeData.bitcoinFee)
			? $storeFeeData.bitcoinFee.bitcoin_fee + $storeFeeData.bitcoinFee.minter_fee
			: undefined;
</script>

{#if nonNullish(bitcoinEstimatedFee)}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_btc}</svelte:fragment>

			{formatToken({
				value: BigNumber.from(bitcoinEstimatedFee),
				unitName: BTC_DECIMALS,
				displayDecimals: BTC_DECIMALS
			})}
			BTC
		</Value>
	</div>
{/if}
