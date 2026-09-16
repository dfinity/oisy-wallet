<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import DefaultEarningOpportunityCard from '$lib/components/earning/DefaultEarningOpportunityCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { borrowData } from '$lib/derived/borrow.derived';
	import { borrowProviders } from '$lib/providers/borrow.providers';
	import { i18n } from '$lib/stores/i18n.store';

	let anyProviderData = $derived(borrowProviders.some(({ id }) => nonNullish($borrowData[id])));
</script>

{#if anyProviderData}
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
{:else}
	<EmptyState
		description={$i18n.borrow.provider_unavailable.description}
		title={$i18n.borrow.provider_unavailable.title}
	/>
{/if}
