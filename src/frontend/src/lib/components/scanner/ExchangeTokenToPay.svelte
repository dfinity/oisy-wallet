<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import type { PayableToken } from '$lib/stores/open-crypto-pay.store';

	let { token }: { token: PayableToken } = $props();

	let exchangeBalance = $derived(
		nonNullish(token.feeInUSD)
			? formatCurrency({
					value: token.feeInUSD,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage,
					notBelowThreshold: true
				})
			: undefined
	);
</script>

<output class="text-xs break-all opacity-60">
	{#if nonNullish(exchangeBalance)}
		<div>
			Fee {token.feeInUSD === 0 ? '' : exchangeBalance?.includes('<') ? '' : '~'}{exchangeBalance}
		</div>
	{/if}
</output>
