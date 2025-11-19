<script lang="ts">
	import { setContext } from 'svelte';
	import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
	import {
		GLDT_STAKE_CONTEXT_KEY,
		type GldtStakeContext as GldtStakeContextType,
		gldtStakeStore
	} from '$icp/stores/gldt-stake.store';
	import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
	import RewardsEligibilityContext from '$lib/components/rewards/RewardsEligibilityContext.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import EarningHeader from '$lib/components/earning/EarningHeader.svelte';

	setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: gldtStakeStore
	});
</script>

<RewardsEligibilityContext>
	<GldtStakeContext>
		<div class="flex flex-col gap-5">
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
	</GldtStakeContext>
</RewardsEligibilityContext>
