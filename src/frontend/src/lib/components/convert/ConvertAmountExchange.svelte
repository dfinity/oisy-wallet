<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import {
		CONVERT_AMOUNT_EXCHANGE_SKELETON,
		CONVERT_AMOUNT_EXCHANGE_VALUE
	} from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatCurrency } from '$lib/utils/format.utils';

	export let amount: OptionAmount = undefined;
	export let exchangeRate: number | undefined = undefined;

	let usdValue: number | undefined;
	$: usdValue =
		nonNullish(amount) && nonNullish(exchangeRate) ? Number(amount) * exchangeRate : undefined;

	let displayValue: string | undefined;
	$: displayValue = nonNullish(usdValue)
		? formatCurrency({
				value: usdValue,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage,
				notBelowThreshold: usdValue !== 0
			})
		: undefined;
</script>

{#if nonNullish(usdValue)}
	<div data-tid={CONVERT_AMOUNT_EXCHANGE_VALUE} in:fade>
		{usdValue === 0 ? '' : displayValue?.includes('<') ? '' : '~'}{displayValue}
	</div>
{:else if isNullish(amount)}
	<div class="w-10 sm:w-8" data-tid={CONVERT_AMOUNT_EXCHANGE_SKELETON} in:fade>
		<SkeletonText />
	</div>
{/if}
