<script lang="ts">
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ADDRESS_BOOK_ADD_CONTACT_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';

	interface Props {
		contacts: Contact[];
		onAddContact: () => void;
		onShowContact: (contact: Contact) => void;
	}
	let { contacts, onAddContact, onShowContact }: Props = $props();
</script>

<ContentWithToolbar styleClass="mx-2 flex flex-col items-stretch">
	{#if contacts.length === 0}
		<EmptyAddressBook {onAddContact}></EmptyAddressBook>
	{:else}
		<div class="flex">
			<Button
				colorStyle="secondary-light"
				on:click={() => onAddContact()}
				testId={ADDRESS_BOOK_ADD_CONTACT_BUTTON}
			>
				<IconPlus></IconPlus>
				{$i18n.address_book.text.add_contact}
			</Button>
		</div>

		<div class="flex flex-col gap-2 py-6">
			<!--
			TODO: Add contact cards here
			https://github.com/dfinity/oisy-wallet/pull/6243
			-->
			{#each contacts as contact, index (index)}
				{#if index > 0}
					<Hr />
				{/if}
				<div class="flex items-center">
					<div class="grow">CONTACT: {contact.name} #addresses {contact.addresses.length}</div>
					<Button styleClass="flex-none" on:click={() => onShowContact(contact)}>Show</Button>
				</div>
			{/each}
		</div>
	{/if}

	<ButtonCloseModal slot="toolbar" />
</ContentWithToolbar>
