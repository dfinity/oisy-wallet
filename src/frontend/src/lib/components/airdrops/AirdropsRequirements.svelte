<script lang="ts">
	import { IconCheckCircleFill } from '@dfinity/gix-components';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { AIRDROPS_REQUIREMENTS_STATUS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	export let loading = true;
	export let airdrop: AirdropDescription;
	export let isEligible = false;
	export let requirementsFulfilled: boolean[];

	const isRequirementFulfilled = (index: number) =>
		(airdrop.requirements.length === requirementsFulfilled.length &&
			requirementsFulfilled[index]) ??
		false;
</script>

{#if airdrop.requirements.length > 0}
	<span class="text-md font-semibold"
		>{$i18n.airdrops.text.requirements_title}
	</span>{#if isEligible}<span class="inline-flex pl-3"
			><Badge variant="success">{$i18n.airdrops.text.youre_eligible}</Badge></span
		>{/if}
	<ul class="list-none">
		{#each airdrop.requirements as requirement, i}
			<li class="flex gap-2 pt-1">
				<span
					class="flex w-full flex-row"
					class:transition={!isRequirementFulfilled(i) && loading}
					class:duration-500={!isRequirementFulfilled(i) && loading}
					class:ease-in-out={!isRequirementFulfilled(i) && loading}
					class:animate-pulse={!isRequirementFulfilled(i) && loading}
				>
					<span
						data-tid={`${AIRDROPS_REQUIREMENTS_STATUS}-${i}`}
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
