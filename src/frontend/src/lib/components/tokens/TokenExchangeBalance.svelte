<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenFinancialData } from '$lib/types/token';
	import { formatCurrency } from '$lib/utils/format.utils';

	export let balance: TokenFinancialData['balance'];
	export let usdBalance: TokenFinancialData['usdBalance'];
	export let nullishBalanceMessage: string | undefined = undefined;
</script>

<output class="break-all">
	{#if nonNullish(balance) && nonNullish(usdBalance)}
		{formatCurrency({
			value: usdBalance,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore
		})}
	{:else if isNullish(balance) || isNullish(usdBalance)}
		<span class="animate-pulse">{nullishBalanceMessage ?? '-'}</span>
	{:else}
		<span class:animate-pulse={isNullish(balance)}>{$i18n.tokens.balance.error.not_applicable}</span
		>
	{/if}
</output>
