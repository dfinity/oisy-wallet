<script lang="ts">
	import type { CriterionEligibility } from '$declarations/rewards/rewards.did';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardRequirement from '$lib/components/rewards/RewardRequirement.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		reward: RewardDescription;
		isEligible: boolean;
		criteria: CriterionEligibility[];
	}

	let { reward, isEligible, criteria }: Props = $props();
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
