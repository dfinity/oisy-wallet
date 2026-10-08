<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import DefaultEarningOpportunityCard from '$lib/components/earning/DefaultEarningOpportunityCard.svelte';
	import { earningData } from '$lib/derived/earning.derived';
	import { earningProviders } from '$lib/providers/earning.providers';
</script>

<div class="mt-5 flex grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex-row">
	{#each earningProviders as provider, i (`${provider.id}-${i}`)}
		{#if nonNullish($earningData[provider.id])}
			<DefaultEarningOpportunityCard
				cardData={provider.card}
				cardFields={$earningData[provider.id]}
			/>
		{/if}
	{/each}
</div>
