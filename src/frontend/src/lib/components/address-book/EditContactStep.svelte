<script lang="ts">
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
	import type { Contact } from '$lib/types/contact';

	let {
		contact,
		close,
		edit
	}: { contact: Contact; close: () => void; edit: (contact: Contact) => void } = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col items-stretch gap-3">
	<ContactHeaderEdit {contact} select={() => edit(contact)}></ContactHeaderEdit>
	<Hr />

	<Button
		styleClass="p-3 self-start"
		ariaLabel={$i18n.address_book.edit_contact.add_address}
		colorStyle="tertiary-main-card"
		disabled={true}
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
		disabled={true}
	>
		<span class="flex items-center">
			<IconTrash />
		</span>
		{$i18n.address_book.edit_contact.delete_contact}
	</Button>

	<ButtonGroup slot="toolbar">
		<ButtonCancel on:click={() => close()} testId={CONTACT_SHOW_CLOSE_BUTTON}></ButtonCancel>
	</ButtonGroup>
</ContentWithToolbar>
