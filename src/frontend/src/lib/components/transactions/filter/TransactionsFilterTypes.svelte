<script lang="ts">
	import IconListFilter from '$lib/components/icons/lucide/IconListFilter.svelte';
	import TransactionsFilterTypesPanel from '$lib/components/transactions/filter/TransactionsFilterTypesPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TYPES_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';

	let selected = $derived($transactionsFilterStore.types);

	let triggerLabel = $derived(
		selected.length === 0
			? $i18n.transaction.filter.types_label
			: ($i18n.transaction.type[selected[0]] ?? $i18n.transaction.filter.types_label)
	);
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.types_aria_label}
	count={selected.length}
	testId={TRANSACTIONS_FILTER_TYPES_DROPDOWN}
	{triggerLabel}
>
	{#snippet triggerIcon()}
		<IconListFilter size="20" />
	{/snippet}

	{#snippet panel()}
		<TransactionsFilterTypesPanel />
	{/snippet}
</MultiSelectDropdown>
