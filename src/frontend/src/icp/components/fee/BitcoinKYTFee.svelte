<script lang="ts">
	import {debounce, nonNullish} from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
	import { tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { NetworkId } from '$lib/types/network';
	import {formatToken, formatUSD} from '$lib/utils/format.utils';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import {usdValue} from "$lib/utils/exchange.utils";
	import {SWAP_TOTAL_FEE_THRESHOLD} from "$lib/constants/swap.constants";
	import {replacePlaceholders} from "$lib/utils/i18n.utils";

	export let networkId: NetworkId | undefined = undefined;

	const { sendTokenId, sendToken, sendTokenExchangeRate, sendBalance, sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger($tokenWithFallbackAsIcToken);

	let btcNetwork = false;
	$: btcNetwork = isNetworkIdBitcoin(networkId);

	let kytFee: bigint | undefined = undefined;
	$: kytFee = nonNullish($sendTokenId)
		? $ckBtcMinterInfoStore?.[$sendTokenId]?.data.kyt_fee
		: undefined;

	let usdFee: number;
	$: usdFee = nonNullish($sendToken) && nonNullish(kytFee) && nonNullish($sendTokenExchangeRate)
			? usdValue({token: $sendToken, balance: kytFee, exchangeRate: $sendTokenExchangeRate})
			: 0;

	let insufficientFeeFunds = false;

	const debounceCheckFeeFunds = debounce(
			() =>
					(insufficientFeeFunds = nonNullish($sendBalance) && nonNullish(kytFee) && $sendBalance.lt(kytFee))
	);

	$: $sendBalance, kytFee, debounceCheckFeeFunds();
</script>

{#if ckBTC && btcNetwork && nonNullish(kytFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_inter_network}</svelte:fragment>

			<div class="flex gap-4">
				{formatToken({
					value: BigNumber.from(kytFee),
					unitName: BTC_DECIMALS,
					displayDecimals: BTC_DECIMALS
				})}
				BTC

				<div class="text-tertiary">
					{#if usdFee < SWAP_TOTAL_FEE_THRESHOLD}
						{`( < ${formatUSD({
							value: SWAP_TOTAL_FEE_THRESHOLD
						})} )`}
					{:else}
						{`( ${formatUSD({ value: usdFee })} )`}
					{/if}
				</div>
			</div>

			{#if insufficientFeeFunds && nonNullish($sendBalance)}
				<p in:slide={SLIDE_DURATION} class="text-cyclamen">
					{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
						$balance: formatToken({
							value: $sendBalance,
							displayDecimals: $sendTokenDecimals
						}),
						$symbol: $sendToken.symbol ?? ''
					})}
				</p>
			{/if}
		</Value>
	</div>
{/if}
