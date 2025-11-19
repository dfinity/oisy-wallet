<script>
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import EarningPotentialCard from '$lib/components/earning/EarningPotentialCard.svelte';
	import EarningPositionCard from '$lib/components/earning/EarningPositionCard.svelte';
</script>

<StakeContentSection>
	{#snippet title()}
		<h3 class="w-full text-center">Welcome to Earn!</h3>
	{/snippet}
	{#snippet content()}
		<p class="w-full text-center">
			Grow your crypto portfolio by staking your tokens and earning rewards. Choose from various
			earning strategies based on your risk tolerance.
		</p>

		<div class="flex w-full grid-cols-2 gap-3">
			<EarningPotentialCard />
			<EarningPositionCard />
		</div>
	{/snippet}
</StakeContentSection>
