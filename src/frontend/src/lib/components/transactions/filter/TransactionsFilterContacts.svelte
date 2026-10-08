<script lang="ts">
	import IconUserSquare from '$lib/components/icons/lucide/IconUserSquare.svelte';
	import TransactionsFilterContactsPanel from '$lib/components/transactions/filter/TransactionsFilterContactsPanel.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_CONTACTS_DROPDOWN } from '$lib/constants/test-ids.constants';
	import {
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_FILTER_MODIFIERS
	} from '$lib/enums/plausible';
	import { trackTransactionFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.contactIds));

	const onToggle = (visible: boolean) => {
		trackTransactionFilter({
			modifier: visible
				? PLAUSIBLE_EVENT_FILTER_MODIFIERS.OPEN
				: PLAUSIBLE_EVENT_FILTER_MODIFIERS.CLOSE,
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.CONTACT
		});
	};
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.contacts_aria_label}
	count={selectedSet.size}
	{onToggle}
	panelWidthClass="w-full sm:w-72"
	testId={TRANSACTIONS_FILTER_CONTACTS_DROPDOWN}
	triggerLabel={$i18n.transaction.filter.contacts_label}
>
	{#snippet triggerIcon()}
		<IconUserSquare size="20" />
	{/snippet}

	{#snippet panel()}
		<TransactionsFilterContactsPanel autofocus />
	{/snippet}
</MultiSelectDropdown>
