<script lang="ts">
	import EarningTopRateCard from '$lib/components/earning/EarningTopRateCard.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import { earningTopRates, earningUninvestedUsd } from '$lib/derived/earning.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

{#if $earningTopRates.length > 0}
	<StakeContentSection>
		{#snippet title()}
			<h4>{$i18n.earning.text.top_rates}</h4>
		{/snippet}

		{#snippet content()}
			<div class="flex w-full flex-col">
				{#each $earningTopRates as topRate (topRate.id)}
					<EarningTopRateCard {topRate} uninvestedUsd={$earningUninvestedUsd} />
				{/each}
			</div>
		{/snippet}
	</StakeContentSection>
{/if}
