<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import IconAddressBook from '$lib/components/icons/IconAddressBook.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { TRANSACTIONS_FILTER_CONTACTS_EMPTY_CTA } from '$lib/constants/test-ids.constants';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import { matchesContactByText } from '$lib/utils/contact.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

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

	const openAddressBook = () => {
		modalStore.openAddressBook({ id: Symbol() });
	};
</script>

<div class="flex flex-col gap-3">
	{#if isEmpty}
		<div class="flex flex-col items-center gap-3 px-2 py-4 text-center">
			<div class="w-20 text-brand-primary [&_svg]:h-auto [&_svg]:w-full" aria-hidden="true">
				<IconAddressBook />
			</div>

			<p class="text-sm">{$i18n.send.text.contacts_empty_state_description}</p>

			<p class="mt-2 text-sm text-tertiary">
				<strong
					><span class="relative -top-px mr-1 inline-block align-middle text-success-primary"
						><IconShieldCheck size="16" /></span
					>{replaceOisyPlaceholders($i18n.core.text.oisy_protects_you)}</strong
				>
				{$i18n.transaction.filter.contacts_empty_description}
			</p>

			<Button
				colorStyle="primary"
				fullWidth
				onclick={openAddressBook}
				testId={TRANSACTIONS_FILTER_CONTACTS_EMPTY_CTA}
				type="button"
			>
				{$i18n.transaction.filter.contacts_empty_cta}
			</Button>
		</div>
	{:else}
		<InputSearch
			{autofocus}
			placeholder={$i18n.transaction.filter.search_contacts_placeholder}
			showResetButton={searchValue.length > 0}
			bind:filter={searchValue}
		/>

		<ul class="m-0 flex max-h-80 list-none flex-col gap-0.5 overflow-y-auto p-0">
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
							<span class="flex shrink-0 items-center">
								<Avatar name={contact.name} image={contact.image} variant="xxs" />
							</span>
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
	{/if}
</div>

<!-- See TransactionsFilterTypesPanel for the rationale. -->
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
