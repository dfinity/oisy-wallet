<script lang="ts">
	import { fade } from 'svelte/transition';
	import {
		type EarningCardFields,
		EarningCardFields as EarningCardFieldsEnum
	} from '$env/types/env.earning-cards';
	import { nonNullish } from '@dfinity/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { currentCurrency } from '$lib/derived/currency.derived';

	interface Props {
		value: number;
		showPlusSign?: boolean;
		formatPositiveAmount?: boolean;
	}

	const { value, showPlusSign = false, formatPositiveAmount = false }: Props = $props();

	const yearlyAmount = $derived(
		nonNullish(value)
			? replacePlaceholders($i18n.stake.text.active_earning_per_year, {
					$amount: `${formatCurrency({
						value,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}`
				})
			: undefined
	);
</script>

<span
	class:text-success-primary={formatPositiveAmount && value > 0}
	class:text-brand-primary={!formatPositiveAmount}
	in:fade
>
	{showPlusSign && '+'}{yearlyAmount}
</span>
