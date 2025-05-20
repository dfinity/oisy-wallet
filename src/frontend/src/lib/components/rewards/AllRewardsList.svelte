<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, setContext } from 'svelte';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardDescription } from '$env/types/env-reward';
	import oisyEpisodeFour from '$lib/assets/oisy-episode-four-coming.svg';
	import RewardModal from '$lib/components/rewards/RewardModal.svelte';
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
	import {
		REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
		REWARDS_ENDED_CAMPAIGNS_CONTAINER,
		REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalRewardDetails, modalRewardDetailsData } from '$lib/derived/modal.derived';
	import { RewardStates } from '$lib/enums/reward-states';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getCampaignEligibilities } from '$lib/services/reward.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initRewardEligibilityContext,
		initRewardEligibilityStore,
		REWARD_ELIGIBILITY_CONTEXT_KEY
	} from '$lib/stores/reward.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isEndedCampaign, isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/rewards.utils';

	const store = initRewardEligibilityStore();
	setContext(REWARD_ELIGIBILITY_CONTEXT_KEY, initRewardEligibilityContext(store));

	const loadEligibilityReport = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const campaignEligibilities = await getCampaignEligibilities({ identity: $authIdentity });
		store.setCampaignEligibilities(campaignEligibilities);
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
	<RewardsGroup
		rewards={ongoingCampaigns}
		testId={REWARDS_ACTIVE_CAMPAIGNS_CONTAINER}
		altImg={oisyEpisodeFour}
		altText={replaceOisyPlaceholders($i18n.rewards.alt.coming_soon)}
	/>

	<RewardsGroup
		title={replaceOisyPlaceholders($i18n.rewards.text.upcoming_campaigns)}
		rewards={upcomingCampaigns}
		altText={replaceOisyPlaceholders($i18n.rewards.alt.upcoming_campaigns)}
		testId={REWARDS_UPCOMING_CAMPAIGNS_CONTAINER}
	/>
{:else if selectedRewardState === RewardStates.ENDED}
	<RewardsGroup rewards={endedCampaigns} testId={REWARDS_ENDED_CAMPAIGNS_CONTAINER} />
{/if}

{#if $modalRewardDetails && nonNullish($modalRewardDetailsData)}
	<RewardModal reward={$modalRewardDetailsData} />
{/if}
