<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import ContactHeaderEdit from '$lib/components/address-book/ContactHeaderEdit.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { CONTACT_SHOW_CLOSE_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address, Contact } from '$lib/types/contact';

	interface Props {
		contact: Contact;
		close: () => void;
		edit: (contact: Contact) => void;
		editAddress?: (address: Address) => void;
		addAddress?: () => void;
		deleteContact?: (id: string) => void;
		deleteAddress?: (id: string) => void;
	}

	let { contact, close, edit, editAddress, addAddress, deleteContact, deleteAddress }: Props =
		$props();
</script>

<ContentWithToolbar styleClass="flex flex-col items-stretch gap-3">
	<ContactHeaderEdit {contact} select={() => edit(contact)}></ContactHeaderEdit>

	<Hr />

	<!--
		TODO: Render AddressListItems here
		https://github.com/dfinity/oisy-wallet/pull/6243 
		-->
	{#each contact.addresses as address (address.id)}
		<div class="flex items-center">
			<div class="grow">ADDRESS: {address.address_type} {address.address} {address.alias}</div>
			<div class="flex gap-2">
				{#if nonNullish(editAddress)}
					<Button styleClass="flex-none" on:click={() => editAddress(address)}>Edit</Button>
				{/if}
				{#if nonNullish(deleteAddress)}
					<Button styleClass="flex-none" on:click={() => deleteAddress(address.id)}>Delete</Button>
				{/if}
			</div>
		</div>
		<Hr />
	{/each}

	<Button
		styleClass="p-3 self-start"
		ariaLabel={$i18n.address_book.edit_contact.add_address}
		colorStyle="tertiary-main-card"
		disabled={isNullish(addAddress)}
		on:click={() => addAddress?.()}
	>
		<span class="flex items-center">
			<IconPlus />
		</span>
		{$i18n.address_book.edit_contact.add_address}
	</Button>

	<Hr />

	<Button
		styleClass="p-3 self-start"
		ariaLabel={$i18n.address_book.edit_contact.delete_contact}
		colorStyle="tertiary-main-card"
		disabled={isNullish(deleteContact)}
		on:click={() => deleteContact?.(contact.id)}
	>
		<span class="flex items-center">
			<IconTrash />
		</span>
		{$i18n.address_book.edit_contact.delete_contact}
	</Button>

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={() => close()} testId={CONTACT_SHOW_CLOSE_BUTTON}></ButtonCancel>
	</ButtonGroup>
</ContentWithToolbar>
