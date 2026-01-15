<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatToken, formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		amount: bigint;
		decimals: number;
		symbol: string;
		exchangeRate?: number;
	}

	let { amount, decimals, symbol, exchangeRate }: Props = $props();

	let usdAmount = $derived(
		nonNullish(exchangeRate)
			? usdValue({
					decimals,
					balance: amount,
					exchangeRate
				})
			: undefined
	);

	let displayAmount = $derived(
		`${formatToken({
			value: amount,
			unitName: decimals,
			displayDecimals: EIGHT_DECIMALS
		})} ${symbol}`
	);
</script>

<div class="flex gap-4" transition:fade>
	{displayAmount}

	{#if nonNullish(usdAmount)}
		<div class="text-tertiary">
			{`( ${formatCurrency({
				value: usdAmount,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage,
				notBelowThreshold: true
			})} )`}
		</div>
	{/if}
</div>
