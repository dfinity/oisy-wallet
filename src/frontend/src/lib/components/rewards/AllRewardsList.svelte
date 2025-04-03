<script lang="ts">
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardDescription } from '$env/types/env-reward';
	import rewardBanner from '$lib/assets/rewards-banner.svg';
	import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import {
		REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
		REWARDS_BANNER,
		REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/rewards.utils';

	const ongoingCampaigns: RewardDescription[] = rewardCampaigns.filter(({ startDate, endDate }) =>
		isOngoingCampaign({ startDate, endDate })
	);

	const upcomingCampaigns: RewardDescription[] = rewardCampaigns.filter(({ startDate }) =>
		isUpcomingCampaign(startDate)
	);
</script>

<div class="relative mb-6 flex items-end md:mb-10">
	<div class="max-h-66 overflow-hidden rounded-2xl">
		<Img src={rewardBanner} testId={REWARDS_BANNER} />
	</div>
</div>

<RewardsGroup
	title={$i18n.rewards.text.active_campaigns}
	rewards={ongoingCampaigns}
	testId={REWARDS_ACTIVE_CAMPAIGNS_CONTAINER}
/>

<RewardsGroup
	title={$i18n.rewards.text.upcoming_campaigns}
	rewards={upcomingCampaigns}
	altText={replaceOisyPlaceholders($i18n.rewards.alt.upcoming_campaigns)}
	testId={REWARDS_UPCOMING_CAMPAIGNS_CONTAINER}
/>
