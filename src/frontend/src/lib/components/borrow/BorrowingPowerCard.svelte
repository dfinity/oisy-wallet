<script lang="ts">
	import { slide } from 'svelte/transition';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import {
		liquidiumBorrowingPowerUsd,
		liquidiumTotalBorrowedUsd
	} from '$lib/derived/liquidium.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	let infoExpanded = $state(false);

	let hasDebt = $derived($liquidiumTotalBorrowedUsd > 0);
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="flex items-center justify-center gap-0.5">
			<div class="text-sm font-bold">{$i18n.borrow.text.borrowing_potential}</div>

			<button class="text-tertiary" onclick={() => (infoExpanded = !infoExpanded)}>
				<IconHelp size="18" />
			</button>
		</div>

		{#if infoExpanded}
			<div class="w-full text-sm text-tertiary" transition:slide>
				{$i18n.borrow.text.borrowing_power_hint}
			</div>
		{/if}

		<div class="my-1 text-lg font-bold text-brand-primary-alt sm:text-xl">
			{formatCurrency({
				value: $liquidiumBorrowingPowerUsd,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</div>

		<div class="text-sm font-bold text-tertiary sm:text-base">
			{hasDebt
				? $i18n.borrow.text.remaining_best_provider
				: $i18n.borrow.text.available_best_provider}
		</div>
	{/snippet}
</StakeContentCard>
