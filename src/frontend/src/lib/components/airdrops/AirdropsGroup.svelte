<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import AirdropCard from '$lib/components/airdrops/AirdropCard.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';

	export let title: string;
	export let airdrops: AirdropDescription[];
	export let altText: string | undefined = undefined;
	export let testId: string | undefined = undefined;
</script>

<div class="mb-10 gap-4 flex flex-col" data-tid={testId}>
	<span class="text-lg font-bold first-letter:capitalize">{title}</span>

	{#each airdrops as airdrop}
		<div in:slide={SLIDE_DURATION} class="mt-4">
			<!--            TODO open airdrop modal on click -->
			<AirdropCard {airdrop} testId={nonNullish(testId) ? `${testId}-${airdrop.id}` : undefined} />
		</div>
	{/each}

	{#if nonNullish(altText) && airdrops.length === 0}
		<span class="text-misty-rose">{altText}</span>
	{/if}
</div>
