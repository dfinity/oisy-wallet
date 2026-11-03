<script lang="ts">
	import ListItemCheckbox from '$lib/components/common/ListItemCheckbox.svelte';
	import { TRANSACTIONS_FILTER_TYPE_LABEL } from '$lib/constants/test-ids.constants';
	import {
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_FILTER_MODIFIERS
	} from '$lib/enums/plausible';
	import { TransactionTypeSchema } from '$lib/schema/transaction.schema';
	import { trackTransactionFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { TransactionType } from '$lib/types/transaction';

	const allTypes: TransactionType[] = Array.from(new Set(TransactionTypeSchema.options));

	let translated = $derived(
		allTypes.map((type) => ({ type, label: $i18n.transaction.type[type] }))
	);

	let sortedTypes = $derived(
		[...translated].sort((a, b) =>
			a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
		)
	);

	let selectedSet = $derived(new Set<TransactionType>($transactionsFilterStore.types));

	const onToggleType = (type: TransactionType) => {
		trackTransactionFilter({
			modifier: selectedSet.has(type)
				? PLAUSIBLE_EVENT_FILTER_MODIFIERS.UNSET
				: PLAUSIBLE_EVENT_FILTER_MODIFIERS.SET,
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TRANSACTION_TYPE,
			value: type
		});

		transactionsFilterStore.toggleType(type);
	};
</script>

<ul class="m-0 flex list-none flex-col p-0">
	{#each sortedTypes as { type, label } (type)}
		<ListItemCheckbox
			checked={selectedSet.has(type)}
			inputId={`transactions-filter-type-${type}`}
			onChange={() => onToggleType(type)}
		>
			<span class="truncate" data-tid={TRANSACTIONS_FILTER_TYPE_LABEL}>{label}</span>
		</ListItemCheckbox>
	{/each}
</ul>
