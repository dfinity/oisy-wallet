<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import {
		ADDRESS_BOOK_ADD_CONTACT_BUTTON,
		ADDRESS_BOOK_SEARCH_CONTACT_INPUT
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		contacts: ContactUi[];
		onAddContact: () => void;
		onShowContact: (contact: ContactUi) => void;
	}

	let { contacts, onAddContact, onShowContact }: Props = $props();

	let searchTerm = $state('');

	let filteredContacts = $derived(
		contacts.filter(({ name: contactName }) => {
			const name = contactName.toLowerCase();
			const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
			return terms.every((term) => name.includes(term));
		})
	);
</script>

<ContentWithToolbar styleClass="mx-2 flex flex-col items-stretch">
	{#if contacts.length === 0}
		<EmptyAddressBook {onAddContact}></EmptyAddressBook>
	{:else}
		<div class="flex w-full gap-2">
			<div class="w-3/5">
				<InputSearch
					bind:filter={searchTerm}
					showResetButton={notEmptyString(searchTerm)}
					placeholder={$i18n.address_book.text.search_contact}
					autofocus={true}
					testId={ADDRESS_BOOK_SEARCH_CONTACT_INPUT}
				/>
			</div>
			<div class="flex w-2/5 justify-end pt-[var(--padding)]">
				<Button
					colorStyle="secondary-light"
					on:click={onAddContact}
					testId={ADDRESS_BOOK_ADD_CONTACT_BUTTON}
					styleClass="rounded-[12px]"
				>
					<IconPlus />
					{$i18n.address_book.text.add_contact}
				</Button>
			</div>
		</div>

		<div class="flex flex-col gap-2 py-6">
			{#if filteredContacts.length > 0}
				{#each filteredContacts as contact, index (index)}
					<div class="flex items-center">
						<div class="grow">
							<!-- TODO: Should be updated with Pull request #6462
								Address list item
								https://github.com/dfinity/oisy-wallet/pull/6462
							-->
							CONTACT: {contact.name} #addresses {contact.addresses.length}
						</div>
						<!-- TODO: Should be changed with Pull request #6462 Address list item -->
						<Button styleClass="flex-none" on:click={() => onShowContact(contact)}>Show</Button>
					</div>
				{/each}
			{:else}
				<span class="text-brand-secondary">{$i18n.address_book.text.no_contact_found}</span>
			{/if}
		</div>
	{/if}

	<ButtonCloseModal slot="toolbar" />
</ContentWithToolbar>
