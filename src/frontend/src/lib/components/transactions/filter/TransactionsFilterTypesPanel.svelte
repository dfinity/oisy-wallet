<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
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

<ul class="m-0 flex list-none flex-col gap-1 p-0">
	{#each sortedTypes as { type, label } (type)}
		<li class="flex items-center">
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
