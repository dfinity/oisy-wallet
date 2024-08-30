<script lang="ts">
	import { slide } from 'svelte/transition';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import type { Token } from '$lib/types/token';
	import FeeAmountDisplay from '$icp-eth/components/fee/FeeAmountDisplay.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatDuration } from '$lib/utils/format.utils';

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	let feeToken: Token;
	$: feeToken = $ethereumFeeTokenCkEth ?? $ckEthereumNativeToken;

	let maxTransactionFee: bigint | undefined | null = undefined;
	$: maxTransactionFee = $store?.maxTransactionFee;

	let maxTransactionFeeLastUpdate: number | undefined | null = undefined;
	$: maxTransactionFeeLastUpdate = $store?.maxTransactionFeeLastUpdate ?? 1725000089000;

	let lastUpdateSecondsAgo: number;
	$: lastUpdateSecondsAgo = nonNullish(maxTransactionFeeLastUpdate)
		? Math.floor((Date.now() - maxTransactionFeeLastUpdate) / 1000)
		: 30;
</script>

{#if nonNullish($store)}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label"
				>{replacePlaceholders($i18n.fee.text.estimated_eth, {
					$timePassed: formatDuration(lastUpdateSecondsAgo)
				})}</svelte:fragment
			>

			<div>
				{#if nonNullish(maxTransactionFee)}
					<FeeAmountDisplay
						fee={BigNumber.from(maxTransactionFee)}
						feeSymbol={feeToken.symbol}
						feeTokenId={feeToken.id}
						feeDecimals={feeToken.decimals}
					/>
				{:else}
					&ZeroWidthSpace;
				{/if}
			</div>
		</Value>
	</div>
{/if}
