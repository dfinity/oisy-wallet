<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import {onMount, setContext} from 'svelte';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardDescription } from '$env/types/env-reward';
	import {
		initRewardEligibilityStore,
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import RewardModal from '$lib/components/rewards/RewardModal.svelte';
	import RewardsFilter from '$lib/components/rewards/RewardsFilter.svelte';
	import RewardsGroup from '$lib/components/rewards/RewardsGroup.svelte';
	import {
		REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
		REWARDS_ENDED_CAMPAIGNS_CONTAINER,
		REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
	} from '$lib/constants/test-ids.constants';
	import { modalRewardDetails, modalRewardDetailsData } from '$lib/derived/modal.derived';
	import { RewardStates } from '$lib/enums/reward-states';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { isEndedCampaign, isOngoingCampaign, isUpcomingCampaign } from '$lib/utils/rewards.utils';
	import {getEligibilityReport} from "$lib/services/reward.services";

	const {store} = setContext<RewardEligibilityContext>(REWARD_ELIGIBILITY_CONTEXT_KEY, {
		store: initRewardEligibilityStore()
	});

	onMount(() => {
		const loadEligibilityReport = async () => {
			const report = await getEligibilityReport();
			store.setReport(report);
		}
		loadEligibilityReport();
	});

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

{#if $modalRewardDetails && nonNullish($modalRewardDetailsData)}
	<RewardModal reward={$modalRewardDetailsData} />
{/if}
