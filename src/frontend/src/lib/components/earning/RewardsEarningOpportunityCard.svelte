<script lang="ts">
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import { getContext } from 'svelte';
	import {
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import { normalizeNetworkMultiplier } from '$lib/utils/rewards.utils';
	import { NETWORK_BONUS_MULTIPLIER_DEFAULT } from '$lib/constants/app.constants';
	import { nonNullish } from '@dfinity/utils';
	import { formatToShortDateString } from '$lib/utils/format.utils';
	import { resolveText } from '$lib/utils/i18n.utils';
	import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconCalendarDays from '$lib/components/icons/lucide/IconCalendarDays.svelte';
	import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants';
	import { earningCards } from '$env/earning-cards.env';
	import { i18n } from '$lib/stores/i18n.store';

	const currentReward = $derived(rewardCampaigns[rewardCampaigns.length - 1]);

	const { getCampaignEligibility } = getContext<RewardEligibilityContext>(
		REWARD_ELIGIBILITY_CONTEXT_KEY
	);

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

	const cardData = $derived(earningCards.find((card) => card.id === currentReward?.id));
</script>

{#if nonNullish(cardData)}
	<EarningOpportunityCard>
		{#snippet logo()}
			<Logo size="lg" src={cardData.logo} />
		{/snippet}
		{#snippet badge()}
			<span class="mr-2"><IconCalendarDays size="14" /></span>
			{$i18n.rewards.text.active_date}
			{`${formatToShortDateString({ date: currentReward.endDate, i18n: $i18n })} ${currentReward.endDate.getDate()}`}
		{/snippet}
		{#snippet title()}
			{resolveText({ i18n: $i18n, path: cardData.title })}
		{/snippet}
		{#snippet description()}
			<p>{resolveText({ i18n: $i18n, path: cardData.description })}</p>

			<RewardsRequirements
				{criteria}
				{hasNetworkBonus}
				{isEligible}
				{networkBonusMultiplier}
				reward={currentReward}
				type="earnings-card"
			/>
		{/snippet}
		{#snippet button()}
			<Button
				colorStyle="primary"
				fullWidth
				onclick={() => goto(AppPath.EarningRewards)}
				paddingSmall>{resolveText({ i18n: $i18n, path: cardData.actionText })}</Button
			>
		{/snippet}
	</EarningOpportunityCard>
{/if}
