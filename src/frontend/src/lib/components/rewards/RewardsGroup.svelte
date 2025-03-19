<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardCard from '$lib/components/rewards/RewardCard.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { modalStore } from '$lib/stores/modal.store';

	export let title: string;
	export let rewards: RewardDescription[];
	export let altText: string | undefined = undefined;
	export let testId: string | undefined = undefined;
</script>

<div class="mb-10 flex flex-col gap-4" data-tid={testId}>
	<span class="text-lg font-bold first-letter:capitalize">{title}</span>

	{#each rewards as reward}
		<div in:slide={SLIDE_DURATION} class="mt-4">
			<RewardCard
				on:click={() => modalStore.openRewardDetails(reward)}
				{reward}
				testId={nonNullish(testId) ? `${testId}-${reward.id}` : undefined}
			/>
		</div>
	{/each}

	{#if nonNullish(altText) && rewards.length === 0}
		<span>{altText}</span>
	{/if}
</div>
