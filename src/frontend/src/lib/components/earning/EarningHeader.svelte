<script>
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import EarningPotentialCard from '$lib/components/earning/EarningPotentialCard.svelte';
</script>

<StakeContentSection styleClass="text-center">
	{#snippet title()}
		<h3 class="w-full text-center">Welcome to Earn!</h3>
	{/snippet}
	{#snippet content()}
		<p>Grow yur portfolio pbalbl slbsl</p>

		<div class="flex w-full grid-cols-2">
			<EarningPotentialCard />
		</div>
	{/snippet}
</StakeContentSection>
