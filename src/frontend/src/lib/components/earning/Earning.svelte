<script lang="ts">
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';

	import { setContext } from 'svelte';
	import {
		GLDT_STAKE_CONTEXT_KEY,
		type GldtStakeContext as GldtStakeContextType,
		initGldtStakeStore
	} from '$icp/stores/gldt-stake.store';
	import RewardsEligibilityContext from '$lib/components/rewards/RewardsEligibilityContext.svelte';
	import GldtStakeContext from '$icp/components/stake/gldt/GldtStakeContext.svelte';
	import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';

	setContext<GldtStakeContextType>(GLDT_STAKE_CONTEXT_KEY, {
		store: initGldtStakeStore()
	});
</script>

<RewardsEligibilityContext>
	<GldtStakeContext>
		<div class="flex flex-col">
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
