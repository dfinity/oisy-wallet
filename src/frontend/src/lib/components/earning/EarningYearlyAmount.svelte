<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { Snippet } from 'svelte';

	interface Props {
		value?: number;
		showPlusSign?: boolean;
		formatPositiveAmount?: boolean;
		fallback?: Snippet;
	}

	const { value, showPlusSign = false, formatPositiveAmount = false, fallback }: Props = $props();

	const formattedCurrency = $derived(
		nonNullish(value)
			? formatCurrency({
					value,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);

	const yearlyAmount = $derived(
		nonNullish(formattedCurrency)
			? replacePlaceholders($i18n.stake.text.active_earning_per_year, {
					$amount: `${formattedCurrency}`
				})
			: undefined
	);
</script>

{#if nonNullish(yearlyAmount)}
	<span
		class:text-brand-primary={!formatPositiveAmount}
		class:text-success-primary={formatPositiveAmount && nonNullish(value) && value > 0}
		class:text-tertiary={value === 0}
		in:fade
	>
		{`${showPlusSign ? '+' : ''}${yearlyAmount}`}
	</span>
{:else if nonNullish(fallback)}
	{@render fallback()}
{/if}
