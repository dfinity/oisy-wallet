<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import ContactForm from '$lib/components/address-book/ContactForm.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		ADDRESS_BOOK_CANCEL_BUTTON,
		ADDRESS_BOOK_SAVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		contact?: Partial<ContactUi>;
		onAddContact: (contact: Pick<ContactUi, 'name'>) => void;
		onSaveContact: (contact: ContactUi) => void;
		onClose: () => void;
		isNewContact: boolean;
		disabled?: boolean;
	}

	let {
		onAddContact,
		onSaveContact,
		onClose,
		isNewContact,
		contact = {},
		disabled = false
	}: Props = $props();

	let editingContact = $state(contact ? { ...contact } : {});

	let form: ContactForm | undefined = $state();

	const handleSave = () => {
		if (!form?.isValid) {
			return;
		}

		if (isNewContact && nonNullish(editingContact.name)) {
			onAddContact({ name: editingContact.name });
		} else {
			onSaveContact(editingContact as ContactUi);
		}
	};

	let title = $derived(
		notEmptyString(editingContact?.name?.trim?.())
			? editingContact?.name
			: $i18n.contact.form.add_new_contact
	);

	export { title };
</script>

<ContentWithToolbar styleClass="flex flex-col gap-6 items-center">
	<Avatar name={editingContact?.name} variant="xl"></Avatar>
	<ContactForm bind:contact={editingContact} bind:this={form} {disabled} onSubmit={handleSave}
	></ContactForm>

	<!-- TODO Add address list here -->

	<ButtonGroup slot="toolbar">
		<ButtonCancel {disabled} onclick={() => onClose()} testId={ADDRESS_BOOK_CANCEL_BUTTON}
		></ButtonCancel>
		<Button
			colorStyle="primary"
			onclick={handleSave}
			disabled={!form?.isValid}
			loading={disabled}
			testId={ADDRESS_BOOK_SAVE_BUTTON}
		>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
