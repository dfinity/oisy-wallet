<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import ReferralStateModal from '$lib/components/referral/ReferralStateModal.svelte';
	import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
	import { TRACK_REWARD_CAMPAIGN_WIN } from '$lib/constants/analytics.contants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalReferralState,
		modalReferralStateData,
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

		const { receivedReward, receivedJackpot, receivedReferral, reward } =
			await loadRewardResult($authIdentity);

		const campaign: RewardCampaignDescription | undefined = rewardCampaigns.find(
			({ id }) => id === reward?.campaignId
		);

		if (receivedReward && nonNullish(campaign)) {
			if (receivedJackpot) {
				trackEvent({
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: { campaignId: `${campaign.id}`, type: 'jackpot' }
				});
				modalStore.openRewardState({
					id: rewardModalId,
					data: { reward: campaign, jackpot: receivedJackpot }
				});
			} else if (receivedReferral) {
				trackEvent({
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: { campaignId: `${campaign.id}`, type: 'referral' }
				});
				modalStore.openReferralState({ id: referralModalId, data: campaign });
			} else {
				trackEvent({
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: { campaignId: `${campaign.id}`, type: 'airdrop' }
				});
				modalStore.openRewardState({
					id: rewardModalId,
					data: { reward: campaign, jackpot: false }
				});
			}
		}
	});
</script>

{@render children?.()}

{#if $modalRewardState && nonNullish($modalRewardStateData)}
	<RewardStateModal reward={$modalRewardStateData.reward} jackpot={$modalRewardStateData.jackpot} />
{:else if $modalReferralState && nonNullish($modalReferralStateData)}
	<ReferralStateModal reward={$modalReferralStateData} />
{/if}
