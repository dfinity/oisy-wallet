<script lang="ts">
	import IconListFilter from '$lib/components/icons/lucide/IconListFilter.svelte';
	import TransactionsFilterTypesPanel from '$lib/components/transactions/filter/TransactionsFilterTypesPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TYPES_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { selectedTransactionsFilterTypesCount } from '$lib/derived/transactions-filter.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.types_aria_label}
	count={$selectedTransactionsFilterTypesCount}
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
