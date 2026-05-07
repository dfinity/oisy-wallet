<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import IconUserSquare from '$lib/components/icons/lucide/IconUserSquare.svelte';
	import MultiSelectDropdown from '$lib/components/ui/MultiSelectDropdown.svelte';
	import { TRANSACTIONS_FILTER_CONTACTS_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { allContacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import { matchesContactByText } from '$lib/utils/contact.utils';

	let searchValue = $state('');

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.contactIds));

	let alphaSorted = $derived(
		[...$allContacts].sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
		)
	);

	let filteredContacts = $derived(
		alphaSorted.filter((contact) => matchesContactByText({ contact, query: searchValue }))
	);

	let triggerLabel = $derived.by(() => {
		if (selectedSet.size === 0) {
			return $i18n.transaction.filter.contacts_label;
		}

		const first = alphaSorted.find((c) => selectedSet.has(c.id.toString()));

		return first?.name ?? $i18n.transaction.filter.contacts_label;
	});
</script>

<MultiSelectDropdown
	ariaLabel={$i18n.transaction.filter.contacts_aria_label}
	count={selectedSet.size}
	searchPlaceholder={$i18n.transaction.filter.search_contacts_placeholder}
	searchable
	testId={TRANSACTIONS_FILTER_CONTACTS_DROPDOWN}
	{triggerLabel}
	bind:searchValue
>
	{#snippet triggerIcon()}
		<IconUserSquare size="20" />
	{/snippet}

	{#snippet panel()}
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
	{/snippet}
</MultiSelectDropdown>
