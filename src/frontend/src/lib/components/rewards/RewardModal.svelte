<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardBanner from '$lib/components/rewards/RewardBanner.svelte';
	import RewardDateBadge from '$lib/components/rewards/RewardDateBadge.svelte';
	import RewardEarnings from '$lib/components/rewards/RewardEarnings.svelte';
	import RewardsRequirements from '$lib/components/rewards/RewardsRequirements.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Share from '$lib/components/ui/Share.svelte';
	import { REWARDS_MODAL, REWARDS_MODAL_DATE_BADGE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$lib/stores/reward.store';
	import { isEndedCampaign } from '$lib/utils/rewards.utils';

	interface Props {
		reward: RewardDescription;
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
	<span class="text-center text-xl" slot="title">{reward.title}</span>

	<ContentWithToolbar>
		<RewardBanner {reward} />

		<RewardEarnings {reward} bind:amountOfRewards />
		{#if amountOfRewards > 0}
			<Hr spacing="md" />
		{/if}

		<div class="flex w-full justify-between text-lg font-semibold">
			<span class="inline-flex">{$i18n.rewards.text.participate_title}</span>
			<span>
				<RewardDateBadge date={reward.endDate} testId={REWARDS_MODAL_DATE_BADGE} />
			</span>
		</div>
		<p class="my-3"><Html text={reward.description} /></p>

		{#if !hasEnded}
			<ExternalLink
				href={reward.learnMoreHref}
				ariaLabel={$i18n.rewards.text.learn_more}
				iconVisible={false}
				asButton
				styleClass="rounded-xl px-3 py-2 secondary-light mb-3"
			>
				{$i18n.rewards.text.learn_more}
			</ExternalLink>

			<Share text={$i18n.rewards.text.share} href={reward.campaignHref} styleClass="my-2" />

			{#if criteria.length > 0}
				<Hr spacing="md" />

				<RewardsRequirements {isEligible} {criteria} />
			{/if}
		{/if}

		<Button paddingSmall type="button" fullWidth onclick={modalStore.close} slot="toolbar">
			{$i18n.rewards.text.modal_button_text}
		</Button>
	</ContentWithToolbar>
</Modal>
