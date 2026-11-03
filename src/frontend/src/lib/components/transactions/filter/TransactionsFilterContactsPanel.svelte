<script lang="ts">
	import ListItemCheckbox from '$lib/components/common/ListItemCheckbox.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import TransactionsFilterContactsEmptyState from '$lib/components/transactions/filter/TransactionsFilterContactsEmptyState.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { TRANSACTIONS_FILTER_CONTACT_NAME } from '$lib/constants/test-ids.constants';
	import { contacts } from '$lib/derived/contacts.derived';
	import {
		PLAUSIBLE_EVENT_EVENTS_KEYS,
		PLAUSIBLE_EVENT_FILTER_MODIFIERS
	} from '$lib/enums/plausible';
	import { trackTransactionFilter } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import { matchesContactByText } from '$lib/utils/contact.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		// When the panel is rendered inside a desktop dropdown popover the
		// caller wants the search input to grab focus on open; when it's
		// rendered inside the mobile bottom sheet we leave it unfocused so
		// the on-screen keyboard does not pop up unprompted.
		autofocus?: boolean;
	}

	const { autofocus = false }: Props = $props();

	// Same cap rationale as TransactionsFilterTokensPanel — keep the initial
	// mount cheap so the popover feels instant, and let users search past it.
	const VISIBLE_LIMIT = 50;

	let searchValue = $state('');

	let isEmpty = $derived($contacts.length === 0);

	let selectedSet = $derived(new Set<string>($transactionsFilterStore.contactIds));

	let alphaSorted = $derived(
		[...$contacts].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
	);

	let filteredContacts = $derived(
		alphaSorted.filter((contact) => matchesContactByText({ contact, query: searchValue }))
	);

	let visibleContacts = $derived(
		searchValue.length === 0 ? filteredContacts.slice(0, VISIBLE_LIMIT) : filteredContacts
	);

	let isCapped = $derived(searchValue.length === 0 && filteredContacts.length > VISIBLE_LIMIT);

	// We deliberately omit the contact id / name from the tracking payload to
	// avoid leaking user PII to analytics. We only record that a contact-row
	// toggle happened and whether it set or unset the filter.
	const onToggleContactId = (id: string) => {
		trackTransactionFilter({
			modifier: selectedSet.has(id)
				? PLAUSIBLE_EVENT_FILTER_MODIFIERS.UNSET
				: PLAUSIBLE_EVENT_FILTER_MODIFIERS.SET,
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.CONTACT
		});

		transactionsFilterStore.toggleContactId(id);
	};
</script>

<div class="flex flex-col gap-2">
	{#if isEmpty}
		<TransactionsFilterContactsEmptyState />
	{:else}
		<InputSearch
			{autofocus}
			placeholder={$i18n.transaction.filter.search_contacts_placeholder}
			showResetButton={searchValue.length > 0}
			bind:filter={searchValue}
		/>

		<ul class="m-0 flex max-h-80 list-none flex-col overflow-y-auto p-0">
			{#each visibleContacts as contact (contact.id.toString())}
				{@const id = contact.id.toString()}
				<ListItemCheckbox
					checked={selectedSet.has(id)}
					inputId={`transactions-filter-contact-${id}`}
					onChange={() => onToggleContactId(id)}
				>
					<span class="inline-flex min-w-0 items-center gap-2">
						<span class="flex shrink-0 items-center">
							<Avatar name={contact.name} image={contact.image} variant="xxs" />
						</span>
						<span class="truncate" data-tid={TRANSACTIONS_FILTER_CONTACT_NAME}>{contact.name}</span>
					</span>
				</ListItemCheckbox>
			{/each}
		</ul>

		{#if isCapped}
			<p class="px-(--menu-row-padding-inline) text-xs text-tertiary">
				{replacePlaceholders($i18n.transaction.filter.showing_partial, {
					$shown: `${VISIBLE_LIMIT}`,
					$total: `${filteredContacts.length}`
				})}
			</p>
		{/if}
	{/if}
</div>
