<script lang="ts">
	// TODO: component will be removed within migration to the new Send flow
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';

	export let networkId: NetworkId | undefined = undefined;

	const { sendTokenId, sendTokenDecimals, sendTokenSymbol, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($tokenWithFallbackAsIcToken);

	let btcNetwork = false;
	$: btcNetwork = isNetworkIdBitcoin(networkId);

	let kytFee: bigint | undefined = undefined;
	$: kytFee = nonNullish($sendTokenId)
		? $ckBtcMinterInfoStore?.[$sendTokenId]?.data.kyt_fee
		: undefined;
</script>

{#if ckBTC && btcNetwork && nonNullish(kytFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_inter_network}</svelte:fragment>

			<ExchangeAmountDisplay
				amount={BigNumber.from(kytFee)}
				decimals={$sendTokenDecimals}
				symbol={$sendTokenSymbol}
				exchangeRate={$sendTokenExchangeRate}
			/>
		</Value>
	</div>
{/if}
