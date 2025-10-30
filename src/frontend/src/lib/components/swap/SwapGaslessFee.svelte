<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.fee.text.total_fee}
	{/snippet}

	{#snippet mainValue()}
		<div>
			{$i18n.swap.text.gasless}
		</div>
	{/snippet}

	{#snippet secondaryValue()}
		{formatCurrency({
			value: 0,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})}
	{/snippet}
</ModalValue>
