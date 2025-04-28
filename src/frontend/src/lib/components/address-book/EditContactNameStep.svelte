<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import Avatar from '$lib/components/address-book/Avatar.svelte';
	import ContactForm from '$lib/components/address-book/ContactForm.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		ADDRESS_BOOK_CANCEL_BUTTON,
		ADDRESS_BOOK_SAVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';

	let form: ContactForm | undefined = $state();

	interface EditContactNameStepProps {
		contact?: Partial<Contact>;
		saveContact: (contact: Contact) => void;
		addContact: (contact: Contact) => void;
		close: () => void;
	}

	let {
		contact = $bindable({ addresses: [] }),
		addContact,
		saveContact,
		close
	}: EditContactNameStepProps = $props();

	function handleSave() {
		if (!form?.isValid) {
			return;
		}

		if (contact.id) {
			saveContact(contact as Contact);
		} else {
			addContact(contact as Contact);
		}
	}

	let title = $derived(
		notEmptyString(contact?.id)
			? $i18n.contact.form.edit_contact
			: notEmptyString(contact?.name)
				? contact?.name
				: $i18n.contact.form.add_new_contact
	);

	export { title };
</script>

<ContentWithToolbar styleClass="flex flex-col gap-6 items-center">
	<Avatar name={contact.name} variant="xl"></Avatar>
	<ContactForm bind:contact bind:this={form}></ContactForm>

	<ButtonGroup slot="toolbar">
		<ButtonCancel on:click={() => close()} testId={ADDRESS_BOOK_CANCEL_BUTTON}></ButtonCancel>
		<Button
			colorStyle="primary"
			on:click={() => handleSave()}
			disabled={!form?.isValid}
			testId={ADDRESS_BOOK_SAVE_BUTTON}
		>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
