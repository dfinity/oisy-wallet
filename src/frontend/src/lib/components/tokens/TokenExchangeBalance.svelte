<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenFinancialData } from '$lib/types/token';
	import { formatCurrency } from '$lib/utils/format.utils';

	export let balance: TokenFinancialData['balance'];
	export let usdBalance: TokenFinancialData['usdBalance'];
	export let nullishBalanceMessage: string | undefined = undefined;

	let exchangeBalance: string | undefined;
	$: exchangeBalance = nonNullish(usdBalance)
		? formatCurrency({
				value: usdBalance,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})
		: undefined;
</script>

<output class="break-all">
	{#if nonNullish(balance) && nonNullish(exchangeBalance)}
		{exchangeBalance}
	{:else if isNullish(balance) || isNullish(exchangeBalance)}
		<span class="animate-pulse">{nullishBalanceMessage ?? '-'}</span>
	{:else}
		<span class:animate-pulse={isNullish(balance)}>{$i18n.tokens.balance.error.not_applicable}</span
		>
	{/if}
</output>
