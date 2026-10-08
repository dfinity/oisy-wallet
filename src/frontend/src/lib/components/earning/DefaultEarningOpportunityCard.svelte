<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { EarningCardFields } from '$env/types/env.earning-cards';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import OverlappedLogos from '$lib/components/ui/OverlappedLogos.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { EarningProviderCardConfig, EarningProviderData } from '$lib/types/earning-provider';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		cardData: EarningProviderCardConfig;
		cardFields: EarningProviderData;
		// Badge defaults to the Earn "Max APY" framing; the Borrow page overrides both.
		badgeLabelKey?: string;
		badgeValueClass?: string;
	}

	let {
		cardData,
		cardFields,
		badgeLabelKey = 'stake.text.max_apy_label',
		badgeValueClass = 'text-success-primary'
	}: Props = $props();

	let formattedApy = $derived(nonNullish(cardFields.apy) ? `${cardFields.apy}%` : '-');

	// Borrow-only "cost" rows are hidden until there is an open position (matches the wireframe).
	const isBorrowCostField = (field: EarningCardFields): boolean =>
		field === EarningCardFields.CURRENT_BORROWING || field === EarningCardFields.INTEREST_PER_YEAR;

	const hasPositiveValue = (field: EarningCardFields): boolean =>
		nonNullish(cardFields[field]) && Number(cardFields[field]) > 0;
</script>

<EarningOpportunityCard titles={cardData.titles}>
	{#snippet logo()}
		<Logo size="lg" src={cardData.logo} />
	{/snippet}
	{#snippet badge()}
		{resolveText({ i18n: $i18n, path: badgeLabelKey })}
		<span class={`ml-1 font-bold ${badgeValueClass}`}>{formattedApy}</span>
	{/snippet}
	{#snippet description()}
		<p>{resolveText({ i18n: $i18n, path: cardData.description })}</p>

		<List condensed itemStyleClass="gap-2 text-xs items-center">
			{#each cardData.fields as cardField, i (`${cardField}-${i}`)}
				{#if !isBorrowCostField(cardField) || hasPositiveValue(cardField)}
					<ListItem>
						<span class="text-tertiary"
							>{resolveText({
								i18n: $i18n,
								path: `earning.card_fields.${cardField}`
							})}</span
						>
						<span class="font-bold">
							{#if cardField === EarningCardFields.EARNING_POTENTIAL}
								<EarningYearlyAmount
									showAsNeutral
									showPlusSign
									value={nonNullish(cardFields[cardField])
										? Number(cardFields[cardField])
										: undefined}
								>
									{#snippet fallback()}
										-
									{/snippet}
								</EarningYearlyAmount>
							{:else if (cardField === EarningCardFields.NETWORKS || cardField === EarningCardFields.ASSETS) && Array.isArray(cardFields[cardField])}
								<OverlappedLogos
									icons={cardFields[cardField]}
									invertColor={cardField === EarningCardFields.NETWORKS}
								/>
							{:else if cardField === EarningCardFields.CURRENT_EARNING}
								<EarningYearlyAmount
									showAsSuccess
									showPlusSign
									value={nonNullish(cardFields[cardField])
										? Number(cardFields[cardField])
										: undefined}
								>
									{#snippet fallback()}
										-
									{/snippet}
								</EarningYearlyAmount>
							{:else if cardField === EarningCardFields.CURRENT_BORROWING}
								<span class="text-error-primary">
									{formatCurrency({
										value: Number(cardFields[cardField]),
										currency: $currentCurrency,
										exchangeRate: $currencyExchangeStore,
										language: $currentLanguage
									})}
								</span>
							{:else if cardField === EarningCardFields.INTEREST_PER_YEAR}
								<EarningYearlyAmount
									showAsError
									value={nonNullish(cardFields[cardField])
										? Number(cardFields[cardField])
										: undefined}
								>
									{#snippet fallback()}
										-
									{/snippet}
								</EarningYearlyAmount>
							{:else if cardField === EarningCardFields.APY}
								{formattedApy}
							{:else}
								{nonNullish(cardFields[cardField])
									? resolveText({
											i18n: $i18n,
											path: `${cardFields[cardField]}`
										})
									: '-'}
							{/if}
						</span>
					</ListItem>
				{/if}
			{/each}
		</List>
	{/snippet}
	{#snippet button()}
		<Button colorStyle="success" fullWidth onclick={cardFields.action} paddingSmall
			>{resolveText({ i18n: $i18n, path: cardData.actionText })}</Button
		>
	{/snippet}
</EarningOpportunityCard>
