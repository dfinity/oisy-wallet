<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import DefaultEarningOpportunityCard from '$lib/components/earning/DefaultEarningOpportunityCard.svelte';
	import { borrowData } from '$lib/derived/borrow.derived';
	import { borrowProviders } from '$lib/providers/borrow.providers';
</script>

<div class="mt-5 flex grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex-row">
	{#each borrowProviders as provider, i (`${provider.id}-${i}`)}
		{#if nonNullish($borrowData[provider.id])}
			<DefaultEarningOpportunityCard
				badgeLabelKey="borrow.text.borrow_apr_from"
				badgeValueClass="text-warning-primary"
				cardData={provider.card}
				cardFields={$borrowData[provider.id]}
			/>
		{/if}
	{/each}
</div>
