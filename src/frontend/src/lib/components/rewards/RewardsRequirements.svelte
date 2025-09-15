<script lang="ts">
	import EligibilityTag from '$lib/components/rewards/EligibilityTag.svelte';
	import RewardNetworkBonus from '$lib/components/rewards/RewardNetworkBonus.svelte';
	import RewardRequirement from '$lib/components/rewards/RewardRequirement.svelte';
	import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CampaignCriterion } from '$lib/types/reward';

	interface Props {
		isEligible: boolean;
		criteria: CampaignCriterion[];
	}

	let { isEligible, criteria }: Props = $props();

	const hasNetworkBonus = true; // TODO calculate value
</script>

{#if criteria.length > 0}
	<div class="flex flex-col gap-2 pb-4" class:flex-row={!hasNetworkBonus} class:items-center={!hasNetworkBonus}>
		<span class="text-base font-semibold">
			{$i18n.rewards.requirements.requirements_title}
		</span>

		<div class="flex gap-2.5 flex-wrap" class:pl-3={!hasNetworkBonus}>
			<EligibilityTag {isEligible} />

			{#if hasNetworkBonus}
				<RewardNetworkBonus {isEligible} />
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
