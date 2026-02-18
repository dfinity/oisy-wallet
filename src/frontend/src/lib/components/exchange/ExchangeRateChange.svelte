<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { format24hChangeInCurrency } from '$lib/utils/format.utils';

	interface Props {
		usdPriceChangePercentage24h: number | undefined;
	}

	let { usdPriceChangePercentage24h }: Props = $props();

	let parsedExchangeRateChange = $derived(
		nonNullish(usdPriceChangePercentage24h)
			? format24hChangeInCurrency({
					usdChangePct: usdPriceChangePercentage24h,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);

	let { formattedAbs: formattedExchangeRateChange, sign: exchangeRateChangeSign } = $derived(
		nonNullish(parsedExchangeRateChange)
			? parsedExchangeRateChange
			: { formattedAbs: undefined, sign: undefined }
	);

	let exchangeRateChangeSymbol = $derived(
		nonNullish(exchangeRateChangeSign) ? (exchangeRateChangeSign === 'zero' ? '▸' : '▾') : undefined
	);
</script>

{#if nonNullish(parsedExchangeRateChange)}
	<span
		class="text-sm"
		class:text-error-primary={exchangeRateChangeSign === 'negative'}
		class:text-success-primary={exchangeRateChangeSign === 'positive'}
		class:text-tertiary={exchangeRateChangeSign === 'zero'}
	>
		<span class="inline-block transform" class:rotate-180={exchangeRateChangeSign === 'positive'}>
			{exchangeRateChangeSymbol}
		</span>
		{formattedExchangeRateChange}
	</span>
{/if}
