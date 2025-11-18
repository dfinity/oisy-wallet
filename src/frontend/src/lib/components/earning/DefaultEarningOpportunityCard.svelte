<script lang="ts">
	import { EarningCardFields, type EarningCards } from '$env/types/env.earning-cards';
	import { nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { resolveText } from '$lib/utils/i18n.utils';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import List from '$lib/components/common/List.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		cardData: EarningCards;
		cardFields: { [key in EarningCardFields]?: string | number } & { action: () => Promise<void> };
	}

	const { cardData, cardFields, action }: Props = $props();
</script>

<EarningOpportunityCard>
	{#snippet logo()}
		<Logo size="lg" src={cardData.logo} />
	{/snippet}
	{#snippet badge()}
		{$i18n.stake.text.current_apy_label}
		<span class="ml-1 font-bold text-success-primary">{cardFields.apy}</span>
	{/snippet}
	{#snippet title()}
		{resolveText({ i18n: $i18n, path: cardData.title })}
	{/snippet}
	{#snippet description()}
		<p>{resolveText({ i18n: $i18n, path: cardData.description })}</p>

		<List condensed itemStyleClass="flex-col md:flex-row gap-2 whitespace-nowrap text-xs">
			{#each cardData.fields as cardField, i (`${cardField}-${i}`)}
				<ListItem>
					<span class="text-tertiary"
						>{resolveText({
							i18n: $i18n,
							path: `earning.card_fields.${cardField}`
						})}</span
					>
					<span class="font-bold">
						{#if cardField === EarningCardFields.CURRENT_EARNING || cardField === EarningCardFields.EARNING_POTENTIAL}
							{#if nonNullish(cardFields[cardField])}
								<EarningYearlyAmount
									formatPositiveAmount={cardField === EarningCardFields.CURRENT_EARNING}
									showPlusSign
									value={Number(cardFields[cardField])}
								/>
							{:else}
								-
							{/if}
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
