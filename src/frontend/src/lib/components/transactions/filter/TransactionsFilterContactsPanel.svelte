<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { allContacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { ContactUi } from '$lib/types/contact';
	import { filterAddressFromContact } from '$lib/utils/contact.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// Same cap rationale as TransactionsFilterTokensPanel — keep the initial
	// mount cheap so the popover feels instant, and let users search past it.
	const VISIBLE_LIMIT = 50;

	let searchValue = $state('');

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.contactIds));

	let alphaSorted = $derived(
		[...$allContacts].sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
		)
	);

	// Matches by name, by any address label, by partial address substring, and by full
	// address equivalence (so an ICRC-2 principal finds a contact saved by its derived
	// ICP account-id hex, and vice versa, via filterAddressFromContact).
	const matchesSearch = ({ contact, raw }: { contact: ContactUi; raw: string }): boolean => {
		if (raw.length === 0) {
			return true;
		}

		const needle = raw.toLowerCase();

		if (contact.name.toLowerCase().includes(needle)) {
			return true;
		}

		if (
			contact.addresses.some(
				({ address, label }) =>
					address.toLowerCase().includes(needle) ||
					(nonNullish(label) && label.toLowerCase().includes(needle))
			)
		) {
			return true;
		}

		return nonNullish(filterAddressFromContact({ contact, address: raw }));
	};

	let filteredContacts = $derived(
		alphaSorted.filter((contact) => matchesSearch({ contact, raw: searchValue }))
	);

	let visibleContacts = $derived(
		searchValue.length === 0 ? filteredContacts.slice(0, VISIBLE_LIMIT) : filteredContacts
	);

	let isCapped = $derived(searchValue.length === 0 && filteredContacts.length > VISIBLE_LIMIT);
</script>

<div class="flex flex-col gap-3">
	<InputSearch
		placeholder={$i18n.transaction.filter.search_contacts_placeholder}
		showResetButton={searchValue.length > 0}
		bind:filter={searchValue}
	/>

	<ul class="filter-list">
		{#each visibleContacts as contact (contact.id.toString())}
			{@const id = contact.id.toString()}
			<li>
				<Checkbox
					checked={selectedSet.has(id)}
					inputId={`transactions-filter-contact-${id}`}
					text="inline"
					on:nnsChange={() => transactionsFilterStore.toggleContactId(id)}
				>
					<span class="row-content">
						<Avatar name={contact.name} image={contact.image} variant="xxs" />
						<span class="text-sm">{contact.name}</span>
					</span>
				</Checkbox>
			</li>
		{/each}
	</ul>

	{#if isCapped}
		<p class="text-xs text-tertiary">
			{replacePlaceholders($i18n.transaction.filter.showing_partial, {
				$shown: `${VISIBLE_LIMIT}`,
				$total: `${filteredContacts.length}`
			})}
		</p>
	{/if}
</div>

<style lang="scss">
	ul.filter-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		list-style: none;
		margin: 0;
		padding: 0;

		// See TransactionsFilterTypesPanel for the rationale.
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

		.row-content {
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}
	}
</style>
