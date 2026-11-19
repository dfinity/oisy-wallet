<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatToken, formatCurrency } from '$lib/utils/format.utils';
	import { fade } from '$lib/utils/transitions.utils';

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

	let roundedAmount = $derived(
		formatToken({
			value: amount,
			unitName: decimals,
			displayDecimals: EIGHT_DECIMALS
		})
	);

	// Rounded to eight decimals, a nonzero amount below 0.000000005 would read as zero, which on a
	// token approval is a revocation. Without fixed decimals, `formatToken` states it as below that.
	let displayAmount = $derived(
		`${
			amount > ZERO && Number(roundedAmount) === 0
				? formatToken({ value: amount, unitName: decimals })
				: roundedAmount
		} ${symbol}`
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
