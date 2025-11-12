<script lang="ts">
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
</script>

<div class="flex flex-col">
	<StakeContentSection>
		{#snippet title()}
			<h4>Earning opportunities</h4>
		{/snippet}
		{#snippet content()}
			<AllEarningOpportunityCardList />
		{/snippet}
	</StakeContentSection>
</div>
