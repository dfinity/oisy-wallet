<script lang="ts">
	import { earningCards } from '$env/earning-cards.env';
	import { rewardCampaigns } from '$env/reward-campaigns.env';
	import DefaultEarningOpportunityCard from '$lib/components/earning/DefaultEarningOpportunityCard.svelte';
	import RewardsEarningOpportunityCard from '$lib/components/earning/RewardsEarningOpportunityCard.svelte';
	import { earningData } from '$lib/derived/earning.derived';

	const currentReward = $derived(rewardCampaigns[rewardCampaigns.length - 1]);
</script>

<div class="mt-5 flex grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex-row">
	{#each earningCards as card, i (`${card.id}-${i}`)}
		{#if card.id === currentReward.id}
			<RewardsEarningOpportunityCard />
		{:else}
			<DefaultEarningOpportunityCard cardData={card} cardFields={$earningData[card.id]} />
		{/if}
	{/each}
</div>
