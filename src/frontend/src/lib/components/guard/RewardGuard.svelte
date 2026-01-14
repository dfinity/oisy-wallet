<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, untrack } from 'svelte';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
	import WelcomeModal from '$lib/components/welcome/WelcomeModal.svelte';
	import {
		TRACK_REWARD_CAMPAIGN_WIN,
		TRACK_WELCOME_OPEN
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalRewardState,
		modalRewardStateData,
		modalWelcome,
		modalWelcomeData
	} from '$lib/derived/modal.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { loadRewardResult } from '$lib/services/reward.services';
	import { modalStore } from '$lib/stores/modal.store';
	import { hasUrlCode } from '$lib/stores/url-code.store';
	import { isOngoingCampaign } from '$lib/utils/rewards.utils';

	const rewardModalId = Symbol();
	const welcomeModalId = Symbol();

	let lastTimestamp = $state<bigint | undefined>();
	let hasDisplayedWelcome = $state(false);

	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const { reward, lastTimestamp: timestamp, rewardType } = await loadRewardResult($authIdentity);
		lastTimestamp = timestamp;

		const campaign: RewardCampaignDescription | undefined = rewardCampaigns.find(
			({ id }) => id === reward?.campaignId
		);

		if (nonNullish(rewardType) && nonNullish(campaign)) {
			trackEvent({
				name: TRACK_REWARD_CAMPAIGN_WIN,
				metadata: { campaignId: `${campaign.id}`, type: rewardType }
			});

			modalStore.openRewardState({
				id: rewardModalId,
				data: { reward: campaign, rewardType }
			});
		}
	});

	const handleWelcomeModal = (timestamp: bigint) => {
		if (timestamp !== ZERO || nonNullish($modalStore?.type) || hasDisplayedWelcome || $hasUrlCode) {
			return;
		}

		const ongoingCampaigns = rewardCampaigns
			.filter(({ startDate, endDate }) => isOngoingCampaign({ startDate, endDate }))
			.sort(
				({ id: aId, startDate: aStartDate }, { id: bId, startDate: bStartDate }) =>
					bStartDate.getTime() - aStartDate.getTime() || bId.localeCompare(aId)
			);

		const campaignToDisplay = ongoingCampaigns.length > 0 ? ongoingCampaigns[0] : undefined;

		if (isNullish(campaignToDisplay)) {
			return;
		}

		if (
			isNullish(campaignToDisplay.welcome?.title) &&
			isNullish(campaignToDisplay.welcome?.subtitle) &&
			isNullish(campaignToDisplay.welcome?.description)
		) {
			return;
		}

		hasDisplayedWelcome = true;

		trackEvent({
			name: TRACK_WELCOME_OPEN,
			metadata: { campaignId: `${campaignToDisplay.id}` }
		});

		modalStore.openWelcome({
			id: welcomeModalId,
			data: { reward: campaignToDisplay }
		});
	};

	$effect(() => {
		const timestamp: bigint | undefined = lastTimestamp;
		if (nonNullish(timestamp)) {
			untrack(() => handleWelcomeModal(timestamp));
		}
	});
</script>

{#if $modalRewardState && nonNullish($modalRewardStateData)}
	<RewardStateModal
		reward={$modalRewardStateData.reward}
		rewardType={$modalRewardStateData.rewardType}
	/>
{:else if $modalWelcome && nonNullish($modalWelcomeData)}
	<WelcomeModal reward={$modalWelcomeData.reward} />
{/if}
