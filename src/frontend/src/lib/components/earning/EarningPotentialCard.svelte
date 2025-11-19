<script lang="ts">
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import { highestApyEarningData } from '$lib/derived/earning.derived';

	const potential = $derived($highestApyEarningData);
</script>

<StakeContentCard>
	{#snippet content()}
		{potential}
	{/snippet}
</StakeContentCard>
