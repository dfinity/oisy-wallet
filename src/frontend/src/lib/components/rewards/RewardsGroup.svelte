<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import RewardCard from '$lib/components/rewards/RewardCard.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { TRACK_REWARD_CAMPAIGN_OPEN } from '$lib/constants/analytics.contants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { modalStore } from '$lib/stores/modal.store';
	import { getCampaignState } from '$lib/utils/rewards.utils';

	interface Props {
		title?: string;
		rewards: RewardCampaignDescription[];
		altText?: string;
		altImg?: string;
		testId?: string;
	}

	let { title, rewards, altText, altImg, testId }: Props = $props();

	const modalId = Symbol();
</script>

<div class="mb-10 flex flex-col gap-4" data-tid={testId}>
	{#if nonNullish(title)}
		<span class="text-lg font-bold first-letter:capitalize"><Html text={title} /></span>
	{/if}

	{#each rewards as reward (reward.id)}
		<div class="mt-4" in:slide={SLIDE_DURATION}>
			<RewardCard
				onclick={() => {
					trackEvent({
						name: TRACK_REWARD_CAMPAIGN_OPEN,
						metadata: {
							campaignId: `${reward.id}`,
							state: getCampaignState(reward)
						}
					});
					modalStore.openRewardDetails({ id: modalId, data: reward });
				}}
				{reward}
				testId={nonNullish(testId) ? `${testId}-${reward.id}` : undefined}
			/>
		</div>
	{/each}

	{#if nonNullish(altText) && isNullish(altImg) && rewards.length === 0}
		<span class="text-tertiary"><Html text={altText} /></span>
	{/if}

	{#if nonNullish(altImg) && rewards.length === 0}
		<div class="max-h-66 overflow-hidden rounded-2xl">
			<Img
				alt={altText}
				src={altImg}
				testId={nonNullish(testId) ? `${testId}-alt-img` : undefined}
			/>
		</div>
	{/if}
</div>
