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
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { goto } from '$app/navigation';
	import IconCalendarDays from '$lib/components/icons/lucide/IconCalendarDays.svelte';
	import { formatToShortDateString } from '$lib/utils/format.utils';

	const listItemStyles = 'first:text-tertiary last:text-primary last:font-bold';

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const LATEST_REWARDS_CAMPAIGN = 'sprinkles_s1e5';

	const cardsData: Record<
		string,
		{ [key in EarningCardFields]?: string | number | bigint } & { action: () => Promise<void> }
	> = $derived({
		[LATEST_REWARDS_CAMPAIGN]: {
			action: () => goto(AppPath.EarningRewards)
		},
		'gldt-staking': {
			apy: $gldtStakeStore?.apy ?? 0,
			currentStaked: $gldtStakeStore?.position?.staked ?? 0,
			terms: $i18n.earning.terms.flexible,
			action: () => goto(AppPath.EarningGold)
		}
	});

	$effect(() => {
		console.log(cardsData);
	});

	const { getCampaignEligibility } = getContext<RewardEligibilityContext>(
		REWARD_ELIGIBILITY_CONTEXT_KEY
	);

	const currentReward = $derived(rewardCampaigns.find((r) => r.id === LATEST_REWARDS_CAMPAIGN));
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
	<StakeContentSection>
		{#snippet title()}
			Earning opportunities
		{/snippet}
		{#snippet content()}
			<div class="flex grid grid-cols-2 gap-3 md:flex-row">
				{#each earningCards as card}
					<EarningOpportunityCard>
						{#snippet logo()}
							<Logo src={card.logo} size="lg" />
						{/snippet}
						{#snippet badge()}
							{#if nonNullish(currentReward) && card.id === currentReward.id}
								<span class="mr-2"><IconCalendarDays size="14" /></span>
								{formatToShortDateString({ date: currentReward.endDate, i18n: $i18n }) +
									' ' +
									currentReward.endDate.getDate()}
							{:else}
								Current APY <span class="ml-1 font-bold text-success-primary">8.5%</span>
							{/if}
						{/snippet}
						{#snippet title()}
							{resolveText({ i18n: $i18n, path: card.title })}
						{/snippet}
						{#snippet description()}
							<p>{resolveText({ i18n: $i18n, path: card.description })}</p>

							{#if nonNullish(currentReward) && card.id === currentReward.id}
								<RewardsRequirements
									{criteria}
									{hasNetworkBonus}
									{isEligible}
									{networkBonusMultiplier}
									reward={currentReward}
								/>
							{:else}
								<List condensed itemStyleClass="flex-col md:flex-row">
									{#each card.fields as cardField}
										<ListItem>
											<span class={listItemStyles}
												>{resolveText({
													i18n: $i18n,
													path: `earning.card_fields.${cardField}`
												})}</span
											>
											<span class={listItemStyles}
												>{resolveText({
													i18n: $i18n,
													path: cardsData[card.id][cardField] + ''
												})}</span
											>
										</ListItem>
									{/each}
								</List>
							{/if}
						{/snippet}
						{#snippet button()}
							<Button
								onclick={cardsData[card.id].action}
								colorStyle={card.id === currentReward?.id ? 'primary' : 'success'}
								fullWidth
								paddingSmall>{resolveText({ i18n: $i18n, path: card.actionText })}</Button
							>
						{/snippet}
					</EarningOpportunityCard>
				{/each}
			</div>
		{/snippet}
	</StakeContentSection>
</div>
