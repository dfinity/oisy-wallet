<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { LEND_BORROW_ENABLED } from '$env/lend-borrow';
	import AllBorrowOpportunityCardList from '$lib/components/borrow/AllBorrowOpportunityCardList.svelte';
	import BorrowHeader from '$lib/components/borrow/BorrowHeader.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	onMount(() => {
		if (!LEND_BORROW_ENABLED) {
			goto(AppPath.Earn);
			return;
		}

		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.BORROW,
				event_value: PLAUSIBLE_EVENT_VALUES.BORROW_PAGE
			}
		});
	});
</script>

{#if LEND_BORROW_ENABLED}
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
{/if}
