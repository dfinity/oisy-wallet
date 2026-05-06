<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import IconListFilter from '$lib/components/icons/lucide/IconListFilter.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_TYPES_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { TransactionTypeSchema } from '$lib/schema/transaction.schema';
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

	let triggerLabel = $derived(
		selectedSet.size === 0
			? $i18n.transaction.filter.types_label
			: ($i18n.transaction.type[[...selectedSet][0]] ?? $i18n.transaction.filter.types_label)
	);
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.types_aria_label}
	count={selectedSet.size}
	testId={TRANSACTIONS_FILTER_TYPES_DROPDOWN}
	{triggerLabel}
>
	{#snippet triggerIcon()}
		<IconListFilter size="20" />
	{/snippet}

	{#snippet panel()}
		<ul class="m-0 flex list-none flex-col gap-1 p-0">
			{#each sortedTypes as { type, label } (type)}
				<li class="flex items-center">
					<Checkbox
						inputId={`transactions-filter-type-${type}`}
						checked={selectedSet.has(type)}
						text="inline"
						on:nnsChange={() => transactionsFilterStore.toggleType(type)}
					>
						<span class="text-sm">{label}</span>
					</Checkbox>
				</li>
			{/each}
		</ul>
	{/snippet}
</MultiSelectDropdown>
