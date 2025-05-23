<script lang="ts">
	import RewardRequirement from '$lib/components/rewards/RewardRequirement.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CampaignCriterion } from '$lib/types/reward';

	interface Props {
		isEligible: boolean;
		criteria: CampaignCriterion[];
	}

	let { isEligible, criteria }: Props = $props();
</script>

{#if criteria.length > 0}
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
		{#each criteria as criterion, i (criterion)}
			<li class="flex gap-2 pt-1">
				<RewardRequirement {criterion} testId={`${REWARDS_REQUIREMENTS_STATUS}-${i}`} />
			</li>
		{/each}
	</ul>
{/if}
