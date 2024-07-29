<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { isTokenCkErc20Ledger } from '$icp/utils/ic-send.utils';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import { tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ckEr20 = false;
	$: ckEr20 = isTokenCkErc20Ledger($tokenWithFallbackAsIcToken);

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	let feeToken: Token;
	$: feeToken = ckEr20 ? $ethereumFeeTokenCkEth ?? $ckEthereumNativeToken : $ckEthereumNativeToken;

	let feeSymbol: string;
	$: feeSymbol = feeToken.symbol;

	let maxTransactionFee: bigint | undefined | null = undefined;
	$: maxTransactionFee = $store?.maxTransactionFee;

	const balance = $balancesStore?.[feeToken?.id]?.data ?? BigNumber.from(0n);

	let insufficientFeeFunds = false;
	$: insufficientFeeFunds = nonNullish(maxTransactionFee) && balance.lt(maxTransactionFee);
</script>

{#if nonNullish($store)}
	<div transition:slide={{ duration: 250 }}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_eth}</svelte:fragment>

			<div>
				&ZeroWidthSpace;
				{#if nonNullish(maxTransactionFee)}
					<span in:fade>
						{formatToken({
							value: BigNumber.from(maxTransactionFee),
							displayDecimals: EIGHT_DECIMALS
						})}
						{feeSymbol}
						{#if insufficientFeeFunds}
							<p transition:slide={{ duration: 250 }} class="text-cyclamen text-xs">
								{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
									$balance: formatToken({
										value: balance,
										displayDecimals: EIGHT_DECIMALS
									}),
									$symbol: feeSymbol
								})}
							</p>
						{/if}
					</span>
				{/if}
			</div>
		</Value>
	</div>
{/if}
