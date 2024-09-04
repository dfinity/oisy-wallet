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

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	let feeToken: Token;
	$: feeToken = $ethereumFeeTokenCkEth ?? $ckEthereumNativeToken;

	let maxTransactionFee: bigint | undefined | null = undefined;
	$: maxTransactionFee = $store?.maxTransactionFee;
</script>

{#if nonNullish($store)}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_eth}</svelte:fragment>

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
