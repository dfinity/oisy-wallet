<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { TRANSACTIONS_FILTER_CLEAR_BUTTON } from '$lib/constants/test-ids.constants';
	import { hasActiveTransactionsFilter } from '$lib/derived/transactions-filter.derived';
	import { PLAUSIBLE_EVENT_EVENTS_KEYS } from '$lib/enums/plausible';
	import { trackActivityFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';

	const onClear = () => {
		trackActivityFilter({ key: PLAUSIBLE_EVENT_EVENTS_KEYS.CLEAR });

		transactionsFilterStore.clear();
	};
</script>

{#if $hasActiveTransactionsFilter}
	<Button
		ariaLabel={$i18n.transaction.filter.clear}
		colorStyle="secondary-light"
		onclick={onClear}
		paddingSmall
		styleClass="h-[2.2rem] rounded-lg"
		testId={TRANSACTIONS_FILTER_CLEAR_BUTTON}
		type="button"
	>
		{$i18n.transaction.filter.clear}
	</Button>
{/if}
