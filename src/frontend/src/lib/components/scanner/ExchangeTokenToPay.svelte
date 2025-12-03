<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { OPEN_CRYPTO_PAY_AMOUNT_DISPLAY_SKELETON } from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import type { PayableTokenWithConvertedAmount } from '$lib/types/open-crypto-pay';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		token: PayableTokenWithConvertedAmount;
	}

	let { token }: Props = $props();

	let exchangeBalance = $derived(
		nonNullish(token.amountInUSD)
			? formatCurrency({
					value: token.amountInUSD,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);
</script>

<output class="break-all">
	{#if nonNullish(exchangeBalance)}
		{exchangeBalance}
	{:else}
		<div class="w-10" data-tid={OPEN_CRYPTO_PAY_AMOUNT_DISPLAY_SKELETON} in:fade>
			<SkeletonText />
		</div>
	{/if}
</output>
