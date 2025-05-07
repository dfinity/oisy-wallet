<script lang="ts">
	import { getContext } from 'svelte';
	import type { RewardDescription } from '$env/types/env-reward';
	import {
		REWARD_ELIGIBILITY_CONTEXT_KEY,
		type RewardEligibilityContext
	} from '$icp/stores/reward.store';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import RewardRequirement from "$lib/components/rewards/RewardRequirement.svelte";

	interface Props {
		reward: RewardDescription;
	}

	let { reward }: Props = $props();

	const { store } = getContext<RewardEligibilityContext>(REWARD_ELIGIBILITY_CONTEXT_KEY);

	const campaignEligibility = $derived(store.getCampaignEligibility(reward.id));
	const isEligible = $derived(campaignEligibility?.eligible ?? false);
	const criteria = $derived(campaignEligibility?.criteria ?? []);
</script>

{#if reward.requirements.length > 0}
	<span class="text-base font-semibold">
		{$i18n.rewards.requirements.requirements_title}
	</span>
	{#if isEligible}
		<span class="inline-flex pl-3">
			<Badge variant="success">
				{$i18n.rewards.text.youre_eligible}
			</Badge>
		</span>
	{/if}
	<ul class="list-none">
		{#each criteria as criterion}
			<li class="flex gap-2 pt-1">
				<RewardRequirement {criterion} />
			</li>
		{/each}
	</ul>
{/if}
