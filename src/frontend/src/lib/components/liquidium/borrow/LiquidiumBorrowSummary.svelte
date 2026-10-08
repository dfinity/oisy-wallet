<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumPortfolio } from '$lib/types/liquidium';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		portfolio: LiquidiumPortfolio;
	}

	let { portfolio }: Props = $props();

	const formatUsd = (value: number) =>
		formatCurrency({
			value,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		});
</script>

<div class="mb-4 flex flex-col rounded-xl bg-secondary p-3">
	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.collateral}{/snippet}
		{#snippet mainValue()}{formatUsd(portfolio.totalSuppliedUsd)}{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.borrowing_power}{/snippet}
		{#snippet mainValue()}{formatUsd(portfolio.availableBorrowsUsd)}{/snippet}
	</ModalValue>
</div>
