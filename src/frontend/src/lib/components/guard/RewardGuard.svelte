<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { rewardCampaigns, SPRINKLES_SEASON_1_EPISODE_4_ID } from '$env/reward-campaigns.env';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
	import WelcomeModal from '$lib/components/welcome/WelcomeModal.svelte';
	import { TRACK_REWARD_CAMPAIGN_WIN, TRACK_WELCOME_OPEN } from '$lib/constants/analytics.contants';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalRewardState, modalRewardStateData, modalWelcome } from '$lib/derived/modal.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { modalStore } from '$lib/stores/modal.store';
	import { isOngoingCampaign, loadRewardResult } from '$lib/utils/rewards.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const rewardModalId = Symbol();
	const welcomeModalId = Symbol();

	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const { reward, lastTimestamp, rewardType } = await loadRewardResult($authIdentity);

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

		const season1Episode4Campaign = rewardCampaigns.find(
			({ id }) => id === SPRINKLES_SEASON_1_EPISODE_4_ID
		);
		if (
			nonNullish(lastTimestamp) &&
			lastTimestamp === ZERO &&
			nonNullish(season1Episode4Campaign) &&
			isOngoingCampaign({
				startDate: season1Episode4Campaign.startDate,
				endDate: season1Episode4Campaign.endDate
			}) &&
			isNullish($modalStore?.type)
		) {
			trackEvent({
				name: TRACK_WELCOME_OPEN,
				metadata: { campaignId: `${season1Episode4Campaign.id}` }
			});
			modalStore.openWelcome(welcomeModalId);
		}
	});
</script>

{@render children?.()}

{#if $modalRewardState && nonNullish($modalRewardStateData)}
	<RewardStateModal
		reward={$modalRewardStateData.reward}
		rewardType={$modalRewardStateData.rewardType}
	/>
{:else if $modalWelcome}
	<WelcomeModal />
{/if}
