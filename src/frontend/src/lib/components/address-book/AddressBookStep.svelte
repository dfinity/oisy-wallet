<script lang="ts">
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import SearchContact from '$lib/components/address-book/SearchContact.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ADDRESS_BOOK_ADD_CONTACT_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';

	interface AddressBookStepProps {
		contacts: Contact[];
		addContact: () => void;
		showContact: (contact: Contact) => void;
	}
	let { contacts, addContact, showContact }: AddressBookStepProps = $props();
	let searchTerm = $state('');

	let filteredContacts = $derived(
		contacts.filter((contact) => contact.name.toLowerCase().includes(searchTerm.toLowerCase()))
	);

	const handleSearch = (term: string) => {
		searchTerm = term;
	};
</script>

<ContentWithToolbar styleClass="mx-2 flex flex-col items-stretch">
	{#if contacts.length === 0}
		<EmptyAddressBook onAddContact={addContact}></EmptyAddressBook>
	{:else}
		<!-- <div class="flex">
			<Button
				colorStyle="secondary-light"
				on:click={() => addContact()}
				testId={ADDRESS_BOOK_ADD_CONTACT_BUTTON}
			>
				<IconPlus></IconPlus>
				{$i18n.address_book.text.add_contact}
			</Button>
		</div> -->
		<div class="flex w-full gap-2">
			<div class="w-3/5">
				<SearchContact onSearchChange={handleSearch} />
			</div>
			<div class="flex w-2/5 justify-end pt-1">
				<Button
					colorStyle="secondary-light"
					on:click={() => addContact()}
					testId={ADDRESS_BOOK_ADD_CONTACT_BUTTON}
					styleClass="w-full h-full flex items-center justify-center gap-2 rounded-[12px]"
				>
					<IconPlus />
					{$i18n.address_book.text.add_contact}
				</Button>
			</div>
		</div>

		<div class="flex flex-col gap-2 py-6">
			<!-- 
			TODO: Add contact cards here
			https://github.com/dfinity/oisy-wallet/pull/6243
			-->
			{#if filteredContacts.length > 0}
				{#each filteredContacts as contact, index (index)}
					<div class="flex items-center">
						<div class="grow">CONTACT: {contact.name} #addresses {contact.addresses.length}</div>
						<Button styleClass="flex-none" on:click={() => showContact(contact)}>Show</Button>
					</div>
				{/each}
			{:else}
				<div class="text-gray-500">No contacts found</div>
			{/if}
		</div>
	{/if}

	<ButtonCloseModal slot="toolbar" />
</ContentWithToolbar>
