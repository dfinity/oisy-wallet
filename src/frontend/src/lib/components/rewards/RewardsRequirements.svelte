<script lang="ts">
	import { IconCheckCircleFill } from '@dfinity/gix-components';
	import type { RewardDescription } from '$env/types/env-reward';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { REWARDS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		loading?: boolean;
		reward: RewardDescription;
		isEligible?: boolean;
		requirementsFulfilled: boolean[];
	}

	let { loading = true, reward, isEligible = false, requirementsFulfilled }: Props = $props();

	const isRequirementFulfilled = (index: number) =>
		(reward.requirements.length === requirementsFulfilled.length && requirementsFulfilled[index]) ??
		false;
</script>

{#if reward.requirements.length > 0}
	<span class="text-base font-semibold">
		{$i18n.rewards.text.requirements_title}
	</span>
	{#if isEligible}
		<span class="inline-flex pl-3">
			<Badge variant="success">
				{$i18n.rewards.text.youre_eligible}
			</Badge>
		</span>
	{/if}
	<ul class="list-none">
		{#each reward.requirements as requirement, i (requirement)}
			<li class="flex gap-2 pt-1">
				<span
					class="flex w-full flex-row"
					class:transition={!isRequirementFulfilled(i) && loading}
					class:duration-500={!isRequirementFulfilled(i) && loading}
					class:ease-in-out={!isRequirementFulfilled(i) && loading}
					class:animate-pulse={!isRequirementFulfilled(i) && loading}
				>
					<span
						data-tid={`${REWARDS_REQUIREMENTS_STATUS}-${i}`}
						class="-mt-0.5 mr-2"
						class:text-success-primary={isRequirementFulfilled(i)}
						class:text-disabled={!isRequirementFulfilled(i)}
					>
						<IconCheckCircleFill size={32} />
					</span>
					<span>
						{requirement}
					</span>
				</span>
			</li>
		{/each}
	</ul>
{/if}
