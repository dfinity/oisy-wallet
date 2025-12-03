<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import type { PayableToken } from '$lib/stores/open-crypto-pay.store';
    
	let { token }: { token: PayableToken } = $props();
	let exchangeBalance = $derived(
		nonNullish(token.amountInUSD)
			? formatCurrency({
					value: token.amountInUSD,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);
</script>

<output class="break-all">
	{#if nonNullish(token.amount) && nonNullish(exchangeBalance)}
		{exchangeBalance}
	{:else}
		<span class:animate-pulse={isNullish(token.amount)}
			>{$i18n.tokens.balance.error.not_applicable}</span
		>
	{/if}
</output>