<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { RewardCampaignDescription } from '$env/types/env-reward';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import EligibilityBadge from '$lib/components/rewards/EligibilityBadge.svelte';
	import NetworkBonusImage from '$lib/components/rewards/NetworkBonusImage.svelte';
	import RewardRequirement from '$lib/components/rewards/RewardRequirement.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CampaignCriterion } from '$lib/types/reward';

	interface Props {
		isEligible: boolean;
		hasNetworkBonus: boolean;
		networkBonusMultiplier: number;
		criteria: CampaignCriterion[];
		reward: RewardCampaignDescription;
	}

	let { isEligible, hasNetworkBonus, networkBonusMultiplier, criteria, reward }: Props = $props();

	let infoExpanded = $state(false);
</script>

{#if criteria.length > 0}
	<div
		class="flex flex-col gap-2 pb-4"
		class:flex-row={!hasNetworkBonus}
		class:items-center={!hasNetworkBonus}
	>
		<span class="text-base font-semibold">
			{$i18n.rewards.requirements.requirements_title}
		</span>

		<div class="flex flex-wrap gap-2.5" class:pl-3={!hasNetworkBonus}>
			<EligibilityBadge {isEligible} />

			{#if hasNetworkBonus && nonNullish(networkBonusMultiplier)}
				<NetworkBonusImage disabled={!isEligible} multiplier={networkBonusMultiplier} />

				<button class="p-0.5 text-tertiary" onclick={() => (infoExpanded = !infoExpanded)}>
					<IconHelp size="18" />
				</button>
			{/if}
		</div>

		{#if infoExpanded}
			<span class="mt-1 w-full text-sm text-tertiary" transition:slide>
				{$i18n.rewards.requirements.network_bonus_info}
				<ExternalLink
					href={reward.learnMoreHref}
					iconVisible={false}>{$i18n.rewards.text.learn_more}</ExternalLink
				>
			</span>
		{/if}
	</div>

	<ul class="list-none">
		{#each criteria as criterion, i (criterion)}
			<li class="flex gap-2 pt-1">
				<RewardRequirement {criterion} testId={`${REWARDS_REQUIREMENTS_STATUS}-${i}`} />
			</li>
		{/each}
	</ul>
{/if}
