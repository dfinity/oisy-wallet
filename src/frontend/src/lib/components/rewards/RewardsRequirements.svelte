<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import EligibilityBadge from '$lib/components/rewards/EligibilityBadge.svelte';
	import RewardRequirement from '$lib/components/rewards/RewardRequirement.svelte';
	import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CampaignCriterion } from '$lib/types/reward';
	import NetworkBonusImage from '$lib/components/rewards/NetworkBonusImage.svelte';

	interface Props {
		isEligible: boolean;
		hasNetworkBonus: boolean;
		networkBonusMultiplier: number;
		criteria: CampaignCriterion[];
	}

	let { isEligible, hasNetworkBonus, networkBonusMultiplier, criteria }: Props = $props();
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
				<NetworkBonusImage multiplier={networkBonusMultiplier} disabled={!isEligible} />
			{/if}
		</div>
	</div>

	<ul class="list-none">
		{#each criteria as criterion, i (criterion)}
			<li class="flex gap-2 pt-1">
				<RewardRequirement {criterion} testId={`${REWARDS_REQUIREMENTS_STATUS}-${i}`} />
			</li>
		{/each}
	</ul>
{/if}
