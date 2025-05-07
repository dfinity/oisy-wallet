<script lang="ts">
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ADDRESS_BOOK_ADD_CONTACT_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';

	let { contacts, addContact }: { contacts: Contact[]; addContact: () => void } = $props();
</script>

<ContentWithToolbar styleClass="mx-2 flex flex-col justify-center">
	{#if contacts.length === 0}
		<EmptyAddressBook {addContact}></EmptyAddressBook>
	{:else}
		<div class="flex">
			<Button
				colorStyle="secondary-light"
				on:click={() => addContact()}
				testId={ADDRESS_BOOK_ADD_CONTACT_BUTTON}
			>
				<IconPlus></IconPlus>
				{$i18n.address_book.text.add_contact}
			</Button>
		</div>

		<div class="p-6">
			<h3>TODO Add proper contact list here</h3>
			{#each contacts as contact, index (index)}
				<div>Contact {index + 1}: {contact.name}</div>
			{/each}
		</div>
	{/if}

	<ButtonCloseModal slot="toolbar" />
</ContentWithToolbar>
