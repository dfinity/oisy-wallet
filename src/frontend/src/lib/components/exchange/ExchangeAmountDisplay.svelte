<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { EXCHANGE_USD_AMOUNT_THRESHOLD } from '$lib/constants/exchange.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatToken, formatCurrency } from '$lib/utils/format.utils';

	export let amount: bigint;
	export let decimals: number;
	export let symbol: string;
	export let exchangeRate: number | undefined;

	let usdAmount: number | undefined;
	$: usdAmount = nonNullish(exchangeRate)
		? usdValue({
				decimals,
				balance: amount,
				exchangeRate
			})
		: undefined;

	let displayAmount: string;
	$: displayAmount = `${formatToken({
		value: amount,
		unitName: decimals,
		displayDecimals: EIGHT_DECIMALS
	})} ${symbol}`;
</script>

<div transition:fade class="flex gap-4">
	{displayAmount}

	{#if nonNullish(usdAmount)}
		<div class="text-tertiary">
			{#if usdAmount < EXCHANGE_USD_AMOUNT_THRESHOLD}
				{`( < ${formatCurrency({
					value: EXCHANGE_USD_AMOUNT_THRESHOLD,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})} )`}
			{:else}
				{`( ${formatCurrency({
					value: usdAmount,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})} )`}
			{/if}
		</div>
	{/if}
</div>
