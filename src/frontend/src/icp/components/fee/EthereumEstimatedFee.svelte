<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Token } from '$lib/types/token';
	import type { Option } from '$lib/types/utils';

	const { store } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	const { sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let feeToken: Token;
	$: feeToken = $ethereumFeeTokenCkEth ?? $ckEthereumNativeToken;

	let maxTransactionFee: Option<bigint> = undefined;
	$: maxTransactionFee = $store?.maxTransactionFee;
</script>

{#if nonNullish($store)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_eth}</svelte:fragment>

			<div>
				{#if nonNullish(maxTransactionFee)}
					<ExchangeAmountDisplay
						amount={BigNumber.from(maxTransactionFee)}
						decimals={feeToken.decimals}
						symbol={feeToken.symbol}
						exchangeRate={$sendTokenExchangeRate}
					/>
				{:else}
					&ZeroWidthSpace;
				{/if}
			</div>
		</Value>
	</div>
{/if}
