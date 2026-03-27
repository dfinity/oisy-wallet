<script lang="ts">
	import { onMount } from 'svelte';
	import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
	import EarningHeader from '$lib/components/earning/EarningHeader.svelte';
	import RewardsEligibilityContext from '$lib/components/rewards/RewardsEligibilityContext.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	onMount(() => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.EARN,
				event_value: PLAUSIBLE_EVENT_VALUES.EARN_PAGE
			}
		});
	});
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
