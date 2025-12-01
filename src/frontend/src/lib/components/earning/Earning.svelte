<script lang="ts">
	import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
	import EarningHeader from '$lib/components/earning/EarningHeader.svelte';
	import RewardsEligibilityContext from '$lib/components/rewards/RewardsEligibilityContext.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<RewardsEligibilityContext>
	<div class="flex flex-col gap-6 pb-6">
		<EarningHeader />
		<StakeContentSection>
			{#snippet title()}
				<h4>{$i18n.earning.text.earning_opportunities}</h4>
			{/snippet}
			{#snippet content()}
				<AllEarningOpportunityCardList />
			{/snippet}
		</StakeContentSection>
	</div>
</RewardsEligibilityContext>
