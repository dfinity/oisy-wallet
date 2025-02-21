<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { ZERO } from '$lib/constants/app.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { TokenId } from '$lib/types/token';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import FeeAmountDisplay from "$lib/components/fee/FeeAmountDisplay.svelte";

	export let fee: BigNumber;
	export let feeSymbol: string;
	export let feeTokenId: TokenId;
	export let feeDecimals: number;

	const { sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let balance: Exclude<OptionBalance, null>;
	$: balance = nonNullish($balancesStore) ? ($balancesStore[feeTokenId]?.data ?? ZERO) : undefined;

	let usdFee: number;
	$: usdFee =
		nonNullish(feeDecimals) && nonNullish(fee) && nonNullish($sendTokenExchangeRate)
			? usdValue({
					decimals: feeDecimals,
					balance: fee,
					exchangeRate: $sendTokenExchangeRate
				})
			: 0;

	let insufficientFeeFunds = false;

	const debounceCheckFeeFunds = debounce(
		() => (insufficientFeeFunds = nonNullish(balance) && balance.lt(fee))
	);

	$: balance, fee, debounceCheckFeeFunds();
</script>

<FeeAmountDisplay
		{fee}
		decimals={feeDecimals}
		symbol={feeSymbol}
		exchangeRate={$sendTokenExchangeRate}
/>
{#if insufficientFeeFunds && nonNullish(balance)}
	<p in:slide={SLIDE_DURATION} class="text-cyclamen">
		{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
			$balance: formatToken({
				value: balance,
				displayDecimals: feeDecimals
			}),
			$symbol: feeSymbol ?? ''
		})}
	</p>
{/if}
