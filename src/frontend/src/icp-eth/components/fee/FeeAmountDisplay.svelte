<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { slide } from 'svelte/transition';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import { ZERO_BI } from '$lib/constants/app.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { TokenId } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let fee: BigNumber;
	export let feeSymbol: string;
	export let feeTokenId: TokenId;
	export let feeDecimals: number;
	export let feeExchangeRate: number | undefined = undefined;

	let balance: Exclude<OptionBalance, null>;
	$: balance = nonNullish($balancesStore)
		? ($balancesStore[feeTokenId]?.data ?? ZERO_BI)
		: undefined;

	let insufficientFeeFunds = false;

	const debounceCheckFeeFunds = debounce(
		() => (insufficientFeeFunds = nonNullish(balance) && balance < fee.toBigInt())
	);

	$: balance, fee, debounceCheckFeeFunds();
</script>

<ExchangeAmountDisplay
	amount={fee.toBigInt()}
	decimals={feeDecimals}
	symbol={feeSymbol}
	exchangeRate={feeExchangeRate}
/>

{#if insufficientFeeFunds && nonNullish(balance)}
	<p in:slide={SLIDE_DURATION} class="text-error-primary">
		{replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
			$balance: formatToken({
				value: balance,
				displayDecimals: feeDecimals
			}),
			$symbol: feeSymbol ?? ''
		})}
	</p>
{/if}
