<script lang="ts">
	import { onMount } from 'svelte';
	import AllBorrowOpportunityCardList from '$lib/components/borrow/AllBorrowOpportunityCardList.svelte';
	import BorrowHeader from '$lib/components/borrow/BorrowHeader.svelte';
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
				event_context: PLAUSIBLE_EVENT_CONTEXTS.BORROW,
				event_value: PLAUSIBLE_EVENT_VALUES.BORROW_PAGE
			}
		});
	});
</script>

<div class="flex flex-col gap-6 pb-6">
	<BorrowHeader />
	<StakeContentSection>
		{#snippet title()}
			<h4>{$i18n.borrow.text.borrowing_options}</h4>
		{/snippet}
		{#snippet content()}
			<AllBorrowOpportunityCardList />
		{/snippet}
	</StakeContentSection>
</div>
