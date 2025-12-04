<script lang="ts">
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	let { feeInUSD }: { feeInUSD: number } = $props();
	
	let exchangeBalance = $derived(
		formatCurrency({
			value: feeInUSD,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage,
			notBelowThreshold: true
		})
	);
</script>

<output class="text-xs break-all opacity-60">
	{$i18n.fee.text.fee}
	{feeInUSD === 0 ? '' : exchangeBalance?.includes('<') ? '' : '~'}{exchangeBalance}
</output>
