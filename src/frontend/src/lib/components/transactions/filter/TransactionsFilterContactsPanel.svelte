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
</script>

<div class="flex flex-col gap-2">
	<InputSearch
		placeholder={$i18n.transaction.filter.search_contacts_placeholder}
		showResetButton={searchValue.length > 0}
		bind:filter={searchValue}
	/>

	<ul class="m-0 flex list-none flex-col gap-1 p-0">
		{#each filteredContacts as contact (contact.id.toString())}
			{@const id = contact.id.toString()}
			<li class="flex items-center gap-2">
				<Checkbox
					checked={selectedSet.has(id)}
					inputId={`transactions-filter-contact-${id}`}
					text="inline"
					on:nnsChange={() => transactionsFilterStore.toggleContactId(id)}
				>
					<span class="flex items-center gap-2">
						<Avatar name={contact.name} image={contact.image} variant="xxs" />
						<span class="text-sm">{contact.name}</span>
					</span>
				</Checkbox>
			</li>
		{/each}
	</ul>
</div>
