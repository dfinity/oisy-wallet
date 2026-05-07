<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { allContacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import { matchesContactByText } from '$lib/utils/contact.utils';
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

	let filteredContacts = $derived(
		alphaSorted.filter((contact) => matchesContactByText({ contact, query: searchValue }))
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

	<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
		{#each visibleContacts as contact (contact.id.toString())}
			{@const id = contact.id.toString()}
			<li>
				<Checkbox
					checked={selectedSet.has(id)}
					inputId={`transactions-filter-contact-${id}`}
					text="inline"
					on:nnsChange={() => transactionsFilterStore.toggleContactId(id)}
				>
					<span class="inline-flex items-center gap-2">
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

<!-- See TransactionsFilterTypesPanel for the rationale. -->
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
