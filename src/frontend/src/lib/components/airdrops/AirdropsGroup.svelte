<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { modalStore } from '$lib/stores/modal.store';

	export let title: string;
	export let airdrops: AirdropDescription[];
	export let altText: string | undefined = undefined;
	export let testId: string | undefined = undefined;
</script>

<div class="mb-10 flex flex-col gap-4" data-tid={testId}>
	<span class="text-lg font-bold first-letter:capitalize">{title}</span>

	{#each airdrops as airdrop}
		<div in:slide={SLIDE_DURATION} class="mt-4">
			<AirdropCard
				on:click={() => modalStore.openAirdropDetails(airdrop)}
				{airdrop}
				testId={nonNullish(testId) ? `${testId}-${airdrop.id}` : undefined}
			/>
		</div>
	{/each}

	{#if nonNullish(altText) && airdrops.length === 0}
		<span class="text-misty-rose">{altText}</span>
	{/if}
</div>
