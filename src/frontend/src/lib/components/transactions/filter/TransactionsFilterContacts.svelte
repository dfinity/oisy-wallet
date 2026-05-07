<script lang="ts">
	import IconUserSquare from '$lib/components/icons/lucide/IconUserSquare.svelte';
	import TransactionsFilterContactsPanel from '$lib/components/transactions/filter/TransactionsFilterContactsPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_CONTACTS_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { sortedContacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.contactIds));

	let triggerLabel = $derived.by(() => {
		if (selectedSet.size === 0) {
			return $i18n.transaction.filter.contacts_label;
		}

		const first = $sortedContacts.find((c) => selectedSet.has(c.id.toString()));

		return first?.name ?? $i18n.transaction.filter.contacts_label;
	});
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.contacts_aria_label}
	count={selectedSet.size}
	testId={TRANSACTIONS_FILTER_CONTACTS_DROPDOWN}
	{triggerLabel}
>
	{#snippet triggerIcon()}
		<IconUserSquare size="20" />
	{/snippet}

	{#snippet panel()}
		<TransactionsFilterContactsPanel />
	{/snippet}
</MultiSelectDropdown>
