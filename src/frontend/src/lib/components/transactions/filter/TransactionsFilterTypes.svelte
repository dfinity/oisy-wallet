<script lang="ts">
	import IconListFilter from '$lib/components/icons/lucide/IconListFilter.svelte';
	import TransactionsFilterTypesPanel from '$lib/components/transactions/filter/TransactionsFilterTypesPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TYPES_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { selectedTransactionsFilterTypesCount } from '$lib/derived/transactions-filter.derived';
	import {
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_FILTER_MODIFIERS
	} from '$lib/enums/plausible';
	import { trackTransactionFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	const onToggle = (visible: boolean) => {
		trackTransactionFilter({
			modifier: visible
				? PLAUSIBLE_EVENT_FILTER_MODIFIERS.OPEN
				: PLAUSIBLE_EVENT_FILTER_MODIFIERS.CLOSE,
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TRANSACTION_TYPE
		});
	};
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.types_aria_label}
	count={$selectedTransactionsFilterTypesCount}
	{onToggle}
	panelWidthClass="w-full sm:w-64"
	testId={TRANSACTIONS_FILTER_TYPES_DROPDOWN}
	triggerLabel={$i18n.transaction.filter.types_label}
>
	{#snippet triggerIcon()}
		<IconListFilter size="20" />
	{/snippet}

	{#snippet panel()}
		<TransactionsFilterTypesPanel />
	{/snippet}
</MultiSelectDropdown>
