<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { EarningCardFields, type EarningCards } from '$env/types/env.earning-cards';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		cardData: EarningCards;
		cardFields: { [key in EarningCardFields]?: string | number } & { action: () => Promise<void> };
	}

	const { cardData, cardFields }: Props = $props();

	const formattedApy = $derived(cardFields.apy ? `${cardFields.apy}%` : '-');
</script>

<EarningOpportunityCard titles={cardData.titles}>
	{#snippet logo()}
		<Logo size="lg" src={cardData.logo} />
	{/snippet}
	{#snippet badge()}
		{$i18n.stake.text.current_apy_label}
		<span class="ml-1 font-bold text-success-primary">{formattedApy}</span>
	{/snippet}
	{#snippet description()}
		<p>{resolveText({ i18n: $i18n, path: cardData.description })}</p>

		<List condensed itemStyleClass="gap-2 text-xs">
			{#each cardData.fields as cardField, i (`${cardField}-${i}`)}
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
								showPlusSign
								value={nonNullish(cardFields[cardField])
									? Number(cardFields[cardField])
									: undefined}
							>
								{#snippet fallback()}
									-
								{/snippet}
							</EarningYearlyAmount>
						{:else if cardField === EarningCardFields.CURRENT_EARNING}
							<EarningYearlyAmount
								formatPositiveAmount
								value={nonNullish(cardFields[cardField]) &&
								nonNullish(cardFields[EarningCardFields.APY])
									? (Number(cardFields[cardField]) * Number(cardFields[EarningCardFields.APY])) /
										100
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
			{/each}
		</List>
	{/snippet}
	{#snippet button()}
		<Button colorStyle="success" fullWidth onclick={cardFields.action} paddingSmall
			>{resolveText({ i18n: $i18n, path: cardData.actionText })}</Button
		>
	{/snippet}
</EarningOpportunityCard>
