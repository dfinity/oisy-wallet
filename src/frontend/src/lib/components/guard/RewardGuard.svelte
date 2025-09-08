<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet, untrack } from 'svelte';
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
	import { hasUrlCode } from '$lib/stores/url-code.store';
	import { isOngoingCampaign, loadRewardResult } from '$lib/utils/rewards.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const rewardModalId = Symbol();
	const welcomeModalId = Symbol();

	let lastTimestamp = $state<bigint | undefined>(undefined);
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
		const season1Episode4Campaign = rewardCampaigns.find(
			({ id }) => id === SPRINKLES_SEASON_1_EPISODE_4_ID
		);

		if (
			nonNullish(timestamp) &&
			timestamp === ZERO &&
			nonNullish(season1Episode4Campaign) &&
			isOngoingCampaign({
				startDate: season1Episode4Campaign.startDate,
				endDate: season1Episode4Campaign.endDate
			}) &&
			isNullish($modalStore?.type) &&
			!hasDisplayedWelcome &&
			!$hasUrlCode
		) {
			hasDisplayedWelcome = true;
			trackEvent({
				name: TRACK_WELCOME_OPEN,
				metadata: { campaignId: `${season1Episode4Campaign.id}` }
			});
			modalStore.openWelcome(welcomeModalId);
		}
	};

	$effect(() => {
		const timestamp: bigint | undefined = lastTimestamp;
		untrack(() => {
			if (nonNullish(timestamp)) {
				handleWelcomeModal(timestamp);
			}
		});
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
