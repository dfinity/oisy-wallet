<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { RewardDescription } from '$env/types/env-reward';
	import RewardCard from '$lib/components/rewards/RewardCard.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		title?: string;
		rewards: RewardDescription[];
		altText?: string;
		testId?: string;
	}

	let { title, rewards, altText, testId }: Props = $props();

	const modalId = Symbol();
</script>

<div class="mb-10 flex flex-col gap-4" data-tid={testId}>
	{#if nonNullish(title)}
		<span class="text-lg font-bold first-letter:capitalize"><Html text={title} /></span>
	{/if}

	{#each rewards as reward (reward.id)}
		<div in:slide={SLIDE_DURATION} class="mt-4">
			<RewardCard
				onclick={() => modalStore.openRewardDetails({ id: modalId, data: reward })}
				{reward}
				testId={nonNullish(testId) ? `${testId}-${reward.id}` : undefined}
			/>
		</div>
	{/each}

	{#if nonNullish(altText) && rewards.length === 0}
		<span class="text-tertiary"><Html text={altText} /></span>
	{/if}
</div>
