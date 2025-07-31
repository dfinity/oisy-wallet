<script lang="ts">
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import oisyEpisodeFour from '$lib/assets/oisy-episode-four-coming.svg';
	import RewardsEligibilityContext from '$lib/components/rewards/RewardsEligibilityContext.svelte';
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
	import {
		REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
		REWARDS_ENDED_CAMPAIGNS_CONTAINER,
		REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { RewardStates } from '$lib/enums/reward-states';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isEndedCampaign, isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/rewards.utils';

	let selectedRewardState = $state(RewardStates.ONGOING);

	const ongoingCampaigns: RewardCampaignDescription[] = rewardCampaigns.filter(
		({ startDate, endDate }) => isOngoingCampaign({ startDate, endDate })
	);

	const upcomingCampaigns: RewardCampaignDescription[] = rewardCampaigns.filter(({ startDate }) =>
		isUpcomingCampaign(startDate)
	);

	const endedCampaigns: RewardCampaignDescription[] = rewardCampaigns.filter(({ endDate }) =>
		isEndedCampaign(endDate)
	);
</script>

<RewardsEligibilityContext>
	<RewardsFilter
		endedCampaignsAmount={endedCampaigns.length}
		bind:rewardState={selectedRewardState}
	/>

	{#if selectedRewardState === RewardStates.ONGOING}
		<RewardsGroup
			altImg={oisyEpisodeFour}
			altText={replaceOisyPlaceholders($i18n.rewards.alt.coming_soon)}
			rewards={ongoingCampaigns}
			testId={REWARDS_ACTIVE_CAMPAIGNS_CONTAINER}
		/>

		<RewardsGroup
			altText={replaceOisyPlaceholders($i18n.rewards.alt.upcoming_campaigns)}
			rewards={upcomingCampaigns}
			testId={REWARDS_UPCOMING_CAMPAIGNS_CONTAINER}
			title={replaceOisyPlaceholders($i18n.rewards.text.upcoming_campaigns)}
		/>
	{:else if selectedRewardState === RewardStates.ENDED}
		<RewardsGroup rewards={endedCampaigns} testId={REWARDS_ENDED_CAMPAIGNS_CONTAINER} />
	{/if}
</RewardsEligibilityContext>
