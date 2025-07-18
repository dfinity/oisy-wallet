<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import RewardBanner from '$lib/components/rewards/RewardBanner.svelte';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import RewardEarnings from '$lib/components/rewards/RewardEarnings.svelte';
	import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import {
		TRACK_REWARD_CAMPAIGN_LEARN_MORE,
		TRACK_REWARD_CAMPAIGN_SHARE
	} from '$lib/constants/analytics.contants';
	import { REWARDS_MODAL, REWARDS_MODAL_DATE_BADGE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import { resolveText } from '$lib/utils/i18n.utils.js';
	import { getCampaignState, isEndedCampaign } from '$lib/utils/rewards.utils';

	interface Props {
		reward: RewardCampaignDescription;
	}

	let { reward }: Props = $props();

	const { getCampaignEligibility } = getContext<RewardEligibilityContext>(
		REWARD_ELIGIBILITY_CONTEXT_KEY
	);

	const campaignEligibility = getCampaignEligibility(reward.id);
	const isEligible = $derived($campaignEligibility?.eligible ?? false);
	const criteria = $derived($campaignEligibility?.criteria ?? []);
	const hasEnded = $derived(isEndedCampaign(reward.endDate));

	let amountOfRewards = $state(0);
</script>

<Modal on:nnsClose={modalStore.close} testId={REWARDS_MODAL}>
	<span class="text-center text-xl" slot="title">
		{resolveText({ i18n: $i18n, path: reward.title })}
	</span>

	<ContentWithToolbar>
		<RewardBanner {reward} />

		<RewardEarnings {reward} bind:amountOfRewards />
		{#if amountOfRewards > 0}
			<Hr spacing="md" />
		{/if}

		<div class="flex w-full justify-between text-lg font-semibold">
			<span class="inline-flex">{resolveText({ i18n: $i18n, path: reward.participateTitle })}</span>
			<span>
				<RewardDateBadge date={reward.endDate} testId={REWARDS_MODAL_DATE_BADGE} />
			</span>
		</div>
		<p class="my-3"><Html text={resolveText({ i18n: $i18n, path: reward.description })} /></p>

		{#if !hasEnded}
			<ExternalLink
				href={reward.learnMoreHref}
				ariaLabel={$i18n.rewards.text.learn_more}
				iconVisible={false}
				asButton
				styleClass="rounded-xl px-3 py-2 secondary-light mb-3"
				trackEvent={{
					name: TRACK_REWARD_CAMPAIGN_LEARN_MORE,
					metadata: { campaignId: `${reward.id}`, state: getCampaignState(reward) }
				}}
			>
				{$i18n.rewards.text.learn_more}
			</ExternalLink>

			<Share
				text={$i18n.rewards.text.share}
				href={resolveText({ i18n: $i18n, path: reward.campaignHref })}
				styleClass="my-2"
				trackEvent={{
					name: TRACK_REWARD_CAMPAIGN_SHARE,
					metadata: { campaignId: `${reward.id}`, state: getCampaignState(reward) }
				}}
			/>

			{#if criteria.length > 0}
				<Hr spacing="md" />

				<RewardsRequirements {isEligible} {criteria} />
			{/if}
		{/if}

		{#snippet toolbar()}
			<Button paddingSmall type="button" fullWidth onclick={modalStore.close}>
				{$i18n.rewards.text.modal_button_text}
			</Button>
		{/snippet}
	</ContentWithToolbar>
</Modal>
