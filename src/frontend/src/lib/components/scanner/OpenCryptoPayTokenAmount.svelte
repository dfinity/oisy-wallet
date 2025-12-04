<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BestRateBadge from '$lib/components/ui/BestRateBadge.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		amountInUSD: number;
		isBestRate?: boolean;
	}

	let { amountInUSD, isBestRate=false }: Props = $props();

	let exchangeBalance = $derived(
		formatCurrency({
			value: amountInUSD,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

<output class="flex items-center justify-end gap-2 break-all">
	{#if nonNullish(isBestRate) && isBestRate}
		<BestRateBadge />
	{/if}
	{exchangeBalance}
</output>
