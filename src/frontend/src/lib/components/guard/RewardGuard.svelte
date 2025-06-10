<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { rewardCampaigns, SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
	import type { RewardDescription } from '$env/types/env-reward';
	import ReferralStateModal from '$lib/components/referral/ReferralStateModal.svelte';
	import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
	import { TRACK_REWARD_CAMPAIGN_WIN } from '$lib/constants/analytics.contants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalReferralState,
		modalRewardState,
		modalRewardStateData
	} from '$lib/derived/modal.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { modalStore } from '$lib/stores/modal.store';
	import { loadRewardResult } from '$lib/utils/rewards.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const rewardModalId = Symbol();
	const referralModalId = Symbol();

	onMount(async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		// TODO At the moment the selected campaign is hardcoded. In the future this should be loaded dynamically.
		const reward: RewardDescription | undefined = rewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);

		const { receivedReward, receivedJackpot, receivedReferral } =
			await loadRewardResult($authIdentity);
		if (receivedReward && nonNullish(reward)) {
			if (receivedJackpot) {
				trackEvent({
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: { campaignId: `${reward.id}`, type: 'jackpot' }
				});
				modalStore.openRewardState({
					id: rewardModalId,
					data: { reward, jackpot: receivedJackpot }
				});
			} else if (receivedReferral) {
				modalStore.openReferralState(referralModalId);
			} else {
				trackEvent({
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: { campaignId: `${reward.id}`, type: 'airdrop' }
				});
				modalStore.openRewardState({ id: rewardModalId, data: { reward, jackpot: false } });
			}
		}
	});
</script>

{@render children?.()}

{#if $modalRewardState && nonNullish($modalRewardStateData)}
	<RewardStateModal reward={$modalRewardStateData.reward} jackpot={$modalRewardStateData.jackpot} />
{:else if $modalReferralState}
	<ReferralStateModal />
{/if}
