<script lang="ts">
  	import { notEmptyString } from '@dfinity/utils';
	import noEarningBanner from '$lib/assets/earning/no-earning-banner.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { highestApyEarning, highestEarningPotentialUsd } from '$lib/derived/earning.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	interface Props {
		hideDescription?: boolean;
	}

	let { hideDescription = false }: Props = $props();

	const USD_AMOUNT_THRESHOLD = 20;
</script>

<div class="flex flex-col items-center gap-5 px-6 py-10">
	<Img alt={$i18n.stake.alt.placeholder_image} src={noEarningBanner} />

	<div class="flex flex-col items-center gap-2">
		{#if notEmptyString($i18n.stake.text.title_empty_1)}
			<h5>{$i18n.stake.text.title_empty_1}</h5>
		{/if}
		<h5 class="text-brand-primary">
			{#if $highestEarningPotentialUsd >= USD_AMOUNT_THRESHOLD}
				<span class="text-4xl font-bold">
					{formatCurrency({
						value: $highestEarningPotentialUsd,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage
					})}
				</span>
				{$i18n.stake.text.title_empty_2_usd}
			{:else}
				<span class="text-4xl font-bold">{$highestApyEarning}%</span>
				{$i18n.stake.text.title_empty_2_apy}
			{/if}
		</h5>
		{#if notEmptyString($i18n.stake.text.title_empty_3)}
			<h5>{$i18n.stake.text.title_empty_3}</h5>
		{/if}
	</div>
	{#if !hideDescription}
		<span class="text-tertiary">{$i18n.stake.text.description_empty}</span>
	{/if}
</div>
