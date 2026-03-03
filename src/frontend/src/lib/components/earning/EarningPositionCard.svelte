<script lang="ts">
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		earningYearlyAmountUsd: number;
		earningPositionsUsd: number;
	}

	let { earningPositionsUsd, earningYearlyAmountUsd }: Props = $props();
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm font-bold">{$i18n.stake.text.active_earning}</div>

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount showAsSuccess value={earningPositionsUsd} />
		</div>

		<div class="text-sm font-bold sm:text-base">
			{formatCurrency({
				value: earningYearlyAmountUsd,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</div>
	{/snippet}
</StakeContentCard>
