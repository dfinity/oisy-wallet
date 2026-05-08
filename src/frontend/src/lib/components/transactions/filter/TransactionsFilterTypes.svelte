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
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.types_aria_label}
	count={selectedSet.size}
	panelWidthClass="w-64"
	testId={TRANSACTIONS_FILTER_TYPES_DROPDOWN}
	triggerLabel={$i18n.transaction.filter.types_label}
>
	{#snippet triggerIcon()}
		<IconListFilter size="20" />
	{/snippet}

	{#snippet panel()}
		<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
			{#each sortedTypes as { type, label } (type)}
				<li>
					<Checkbox
						checked={selectedSet.has(type)}
						inputId={`transactions-filter-type-${type}`}
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

<style lang="scss">
	li :global(.checkbox) {
		--checkbox-label-order: 1;
		--checkbox-padding: 6px 8px;
		justify-content: flex-start;
		gap: 8px;
		border-radius: 6px;
		cursor: pointer;
	}

	li :global(.checkbox:hover) {
		background: var(--color-background-brand-subtle-10);
	}

	li :global(label) {
		flex: initial;
	}
</style>
