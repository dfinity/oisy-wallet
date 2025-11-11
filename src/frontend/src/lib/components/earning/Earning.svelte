<script lang="ts">
	import EarningCategoryCard from '$lib/components/earning/EarningCategoryCard.svelte';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { earningCards } from '$env/earning-cards.env';
	import { EarningCardFields } from '$env/types/env.earning-cards';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import { getContext } from 'svelte';
	import {
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import { isEndedCampaign, normalizeNetworkMultiplier } from '$lib/utils/rewards.utils';
	import { NETWORK_BONUS_MULTIPLIER_DEFAULT } from '$lib/constants/app.constants';
	import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import { nonNullish } from '@dfinity/utils';

	const listItemStyles = 'first:text-tertiary last:text-primary last:font-bold';

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const cardsData: Record<string, { [key in EarningCardFields]?: string | number | bigint }> =
		$derived({
			'gldt-staking': {
				apy: $gldtStakeStore?.apy ?? 0,
				currentStaked: $gldtStakeStore?.position?.staked ?? 0,
				terms: $i18n.earning.cards.terms.flexible
			}
		});

	$effect(() => {
		console.log(cardsData);
	});

	const { getCampaignEligibility, store } = getContext<RewardEligibilityContext>(
		REWARD_ELIGIBILITY_CONTEXT_KEY
	);

	const currentReward = $derived(rewardCampaigns.find((r) => r.id === 'sprinkles_s1e5'));
	const campaignEligibility = $derived(
		currentReward ? getCampaignEligibility(currentReward.id) : undefined
	);
	const isEligible = $derived($campaignEligibility?.eligible ?? false);
	const hasNetworkBonus = $derived($campaignEligibility?.probabilityMultiplierEnabled ?? false);
	const networkBonusMultiplier = $derived(
		normalizeNetworkMultiplier(
			$campaignEligibility?.probabilityMultiplier ?? NETWORK_BONUS_MULTIPLIER_DEFAULT
		)
	);
	const criteria = $derived($campaignEligibility?.criteria ?? []);
</script>

<div class="flex flex-col">
	<PageTitle>{$i18n.earning.text.title}</PageTitle>

	<!-- Todo: refactor this once the design is clear -->
	<!-- we know we want to show these 3 cards, thats why the translations have been added already -->

	<div class="grid grid-cols-3 gap-3">
		<EarningCategoryCard appPath={AppPath.EarningGold}>
			{#snippet icon()}
				<IconCrypto />
			{/snippet}
			{#snippet title()}
				{$i18n.earning.cards.gold_title}
			{/snippet}
			{#snippet description()}
				{$i18n.earning.cards.gold_description}
			{/snippet}
		</EarningCategoryCard>
		<EarningCategoryCard appPath={AppPath.EarningRewards}>
			{#snippet icon()}
				<IconGift />
			{/snippet}
			{#snippet title()}
				{$i18n.earning.cards.sprinkles_title}
			{/snippet}
			{#snippet description()}
				{$i18n.earning.cards.sprinkles_description}
			{/snippet}
		</EarningCategoryCard>
		<EarningCategoryCard disabled>
			{#snippet icon()}
				<IconCrypto />
			{/snippet}
			{#snippet title()}
				{$i18n.earning.cards.stablecoins_title}
			{/snippet}
			{#snippet description()}
				{$i18n.earning.cards.stablecoins_description}
			{/snippet}
		</EarningCategoryCard>
	</div>

	<StakeContentSection>
		{#snippet title()}
			Earning opportunities
		{/snippet}
		{#snippet content()}
			<div class="flex flex-col gap-3 md:flex-row">
				{#each earningCards as card}
					<EarningOpportunityCard>
						{#snippet logo()}
							<Logo src={card.logo} size="lg" />
						{/snippet}
						{#snippet badge()}
							Current APY <span class="ml-1 font-bold text-success-primary">8.5%</span>
						{/snippet}
						{#snippet title()}
							{card.title}
						{/snippet}
						{#snippet description()}
							<p>{card.description}</p>

							{#if nonNullish(currentReward) && card.id === currentReward.id}
								<RewardsRequirements
									{criteria}
									{hasNetworkBonus}
									{isEligible}
									{networkBonusMultiplier}
									reward={currentReward}
								/>
							{:else}
								<List condensed itemStyleClass="flex-col md:flex-col">
									{#each card.fields as cardField}
										<ListItem>
											<span class={listItemStyles}>{`earning.card.fields.${cardField}`}</span>
											<span class={listItemStyles}>{cardsData[card.id][cardField]}</span>
										</ListItem>
									{/each}
								</List>
							{/if}
						{/snippet}
						{#snippet button()}
							<Button colorStyle="success" fullWidth paddingSmall>Stake GLDT</Button>
						{/snippet}
					</EarningOpportunityCard>
				{/each}
			</div>
		{/snippet}
	</StakeContentSection>
</div>
