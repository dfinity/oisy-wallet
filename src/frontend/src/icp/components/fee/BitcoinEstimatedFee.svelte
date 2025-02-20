<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import FeeAmountDisplay from '$icp-eth/components/fee/FeeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const { store: storeFeeData } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);
	const { sendTokenId, sendTokenDecimals, sendTokenSymbol } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let bitcoinEstimatedFee: bigint | undefined;
	$: bitcoinEstimatedFee =
		nonNullish($storeFeeData) && nonNullish($storeFeeData.bitcoinFee)
			? $storeFeeData.bitcoinFee.bitcoin_fee + $storeFeeData.bitcoinFee.minter_fee
			: undefined;
</script>

{#if nonNullish(bitcoinEstimatedFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_btc}</svelte:fragment>

			<FeeAmountDisplay
				fee={BigNumber.from(bitcoinEstimatedFee)}
				feeDecimals={$sendTokenDecimals}
				feeTokenId={$sendTokenId}
				feeSymbol={$sendTokenSymbol}
			/>
		</Value>
	</div>
{/if}
