<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import RewardBanner from '$lib/components/rewards/RewardBanner.svelte';
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
	import { REWARDS_MODAL } from '$lib/constants/test-ids.constants';
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
	const hasNetworkBonus = $derived($campaignEligibility?.probabilityActive);
	const networkBonusMultiplier = $derived($campaignEligibility?.probabilityMultiplier);
	const criteria = $derived($campaignEligibility?.criteria ?? []);
	const hasEnded = $derived(isEndedCampaign(reward.endDate));

	let amountOfRewards = $state(0);
</script>

<Modal onClose={modalStore.close} testId={REWARDS_MODAL}>
	{#snippet title()}
		<span class="text-center text-xl">
			{resolveText({ i18n: $i18n, path: reward.title })}
		</span>
	{/snippet}

	<ContentWithToolbar>
		<RewardBanner {reward} />

		<RewardEarnings {reward} bind:amountOfRewards />
		{#if amountOfRewards > 0}
			<Hr spacing="md" />
		{/if}

		<span class="inline-flex text-lg font-semibold"
			>{resolveText({ i18n: $i18n, path: reward.participateTitle })}</span
		>

		<p class="my-3"><Html text={resolveText({ i18n: $i18n, path: reward.description })} /></p>

		{#if !hasEnded}
			<ExternalLink
				ariaLabel={$i18n.rewards.text.learn_more}
				asButton
				href={reward.learnMoreHref}
				iconVisible={false}
				styleClass="rounded-xl px-3 py-2 secondary-light mb-3"
				trackEvent={{
					name: TRACK_REWARD_CAMPAIGN_LEARN_MORE,
					metadata: { campaignId: `${reward.id}`, state: getCampaignState(reward) }
				}}
			>
				{$i18n.rewards.text.learn_more}
			</ExternalLink>

			<Share
				href={resolveText({ i18n: $i18n, path: reward.campaignHref })}
				styleClass="my-2"
				text={$i18n.rewards.text.share}
				trackEvent={{
					name: TRACK_REWARD_CAMPAIGN_SHARE,
					metadata: { campaignId: `${reward.id}`, state: getCampaignState(reward) }
				}}
			/>

			{#if criteria.length > 0}
				<Hr spacing="md" />

				<RewardsRequirements
					{criteria}
					{hasNetworkBonus}
					{isEligible}
					{networkBonusMultiplier}
					{reward}
				/>
			{/if}
		{/if}

		{#snippet toolbar()}
			<Button fullWidth onclick={modalStore.close} paddingSmall type="button">
				{$i18n.rewards.text.modal_button_text}
			</Button>
		{/snippet}
	</ContentWithToolbar>
</Modal>
