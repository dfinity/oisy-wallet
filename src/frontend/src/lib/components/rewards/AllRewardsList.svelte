<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount, setContext } from 'svelte';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
	import {
		REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
		REWARDS_ENDED_CAMPAIGNS_CONTAINER,
		REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { RewardStates } from '$lib/enums/reward-states';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initRewardEligibilityStore,
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isEndedCampaign, isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/rewards.utils';

	const { store } = setContext<RewardEligibilityContext>(REWARD_ELIGIBILITY_CONTEXT_KEY, {
		store: initRewardEligibilityStore()
	});

	const loadEligibilityReport = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		// TODO load campaign eligibilities from reward service
		store.setCampaignEligibilities([]);
	};

	onMount(loadEligibilityReport);

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
