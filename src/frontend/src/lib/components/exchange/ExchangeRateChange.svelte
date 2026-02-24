<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { format24hChangeInCurrency } from '$lib/utils/format.utils';

	interface Props {
		usdPriceChangePercentage24h: number | undefined;
		withBackground?: boolean;
		timeFrame?: '24h';
		fontSize?: 'sm' | 'xs';
	}

	let {
		usdPriceChangePercentage24h,
		withBackground = false,
		timeFrame,
		fontSize = 'sm'
	}: Props = $props();

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
		nonNullish(exchangeRateChangeSign) ? (exchangeRateChangeSign === 'zero' ? '⏵' : '⏷') : undefined
	);

	let parsedTimeFrame = $derived(
		nonNullish(timeFrame) ? $i18n.temporal.time_frame[`t_${timeFrame}`] : undefined
	);
</script>

{#if nonNullish(parsedExchangeRateChange)}
	<span
		class="px-1"
		class:bg-error-subtle-30={withBackground && exchangeRateChangeSign === 'negative'}
		class:bg-success-subtle-30={withBackground && exchangeRateChangeSign === 'positive'}
		class:rounded={withBackground}
		class:sm:text-sm={fontSize === 'sm'}
		class:sm:text-xs={fontSize === 'xs'}
		class:text-error-primary={exchangeRateChangeSign === 'negative'}
		class:text-success-primary={exchangeRateChangeSign === 'positive'}
		class:text-tertiary={exchangeRateChangeSign === 'zero'}
		class:text-xs={fontSize === 'sm'}
		class:text-xxs={fontSize === 'xs'}
	>
		<span class="inline-block transform" class:rotate-180={exchangeRateChangeSign === 'positive'}>
			{exchangeRateChangeSymbol}
		</span>
		{formattedExchangeRateChange}
		{#if nonNullish(parsedTimeFrame)}
			<span class="text-[9px] sm:text-[11px]">{`(${parsedTimeFrame})`}</span>
		{/if}
	</span>
{/if}
