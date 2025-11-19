<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		value?: number;
		showPlusSign?: boolean;
		formatPositiveAmount?: boolean;
	}

	const { value, showPlusSign = false, formatPositiveAmount = false }: Props = $props();

	const yearlyAmount = $derived(
		nonNullish(value)
			? replacePlaceholders($i18n.stake.text.active_earning_per_year, {
					$amount: `${
						formatCurrency({
							value,
							currency: $currentCurrency,
							exchangeRate: $currencyExchangeStore,
							language: $currentLanguage
						}) ?? 0
					}`
				})
			: undefined
	);
</script>

{#if nonNullish(yearlyAmount) && nonNullish(value)}
	<span
		class:text-brand-primary={!formatPositiveAmount}
		class:text-success-primary={formatPositiveAmount && value > 0}
		in:fade
	>
		{`${showPlusSign ? '+' : ''}${yearlyAmount}`}
	</span>
{/if}
