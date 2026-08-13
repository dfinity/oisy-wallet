<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
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

<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
	{#each sortedTypes as { type, label } (type)}
		<li>
			<Checkbox
				checked={selectedSet.has(type)}
				inputId={`transactions-filter-type-${type}`}
				onChange={() => onToggleType(type)}
				text="inline"
			>
				<span class="text-sm">{label}</span>
			</Checkbox>
		</li>
	{/each}
</ul>

<style lang="scss">
	@use '../../../styles/mixins/media';

	li :global(.checkbox) {
		--checkbox-label-order: 1;
		--checkbox-padding: 6px 8px;
		justify-content: flex-start;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		border-radius: 6px;
		cursor: pointer;
	}

	li :global(.checkbox:hover) {
		background: var(--color-background-brand-subtle-10);
	}

	li :global(label) {
		flex: initial;
		display: inline-flex;
		align-items: center;
	}

	// On mobile, give each row a comfortable touch target so checkboxes
	// are easier to tap. The desktop dropdown keeps its denser layout.
	@media (max-width: #{media.$breakpoint-medium - 1px}) {
		li :global(.checkbox) {
			--checkbox-padding: 12px;
		}
	}
</style>
