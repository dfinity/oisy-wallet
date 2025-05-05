<script lang="ts">
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardDescription } from '$env/types/env-reward';
	import rewardBanner from '$lib/assets/rewards-banner.svg';
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
		REWARDS_BANNER,
		REWARDS_ENDED_CAMPAIGNS_CONTAINER,
		REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { RewardStates } from '$lib/enums/reward-states';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isEndedCampaign, isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/rewards.utils';

	let selectedRewardState = $state(RewardStates.ONGOING);

	const ongoingCampaigns: RewardDescription[] = rewardCampaigns.filter(({ startDate, endDate }) =>
		isOngoingCampaign({ startDate, endDate })
	);

	const upcomingCampaigns: RewardDescription[] = rewardCampaigns.filter(({ startDate }) =>
		isUpcomingCampaign(startDate)
	);

	const endedCampaigns: RewardDescription[] = rewardCampaigns.filter(({ endDate }) =>
		isEndedCampaign(endDate)
	);
</script>

<div class="relative mb-6 flex items-end md:mb-10">
	<div class="max-h-66 overflow-hidden rounded-2xl">
		<Img src={rewardBanner} testId={REWARDS_BANNER} />
	</div>
</div>

<RewardsFilter
	bind:rewardState={selectedRewardState}
	endedCampaignsAmount={endedCampaigns.length}
/>

{#if selectedRewardState === RewardStates.ONGOING}
	<RewardsGroup rewards={ongoingCampaigns} testId={REWARDS_ACTIVE_CAMPAIGNS_CONTAINER} />

	<RewardsGroup
		title={$i18n.rewards.text.upcoming_campaigns}
		rewards={upcomingCampaigns}
		altText={replaceOisyPlaceholders($i18n.rewards.alt.upcoming_campaigns)}
		testId={REWARDS_UPCOMING_CAMPAIGNS_CONTAINER}
	/>
{:else if selectedRewardState === RewardStates.ENDED}
	<RewardsGroup rewards={endedCampaigns} testId={REWARDS_ENDED_CAMPAIGNS_CONTAINER} />
{/if}
