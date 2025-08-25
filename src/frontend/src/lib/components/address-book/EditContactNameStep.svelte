<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import InputContactName from '$lib/components/address-book/InputContactName.svelte';
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
		title?: string;
	}

	let {
		onAddContact,
		onSaveContact,
		onClose,
		isNewContact,
		contact = {},
		disabled = false,
		title = $bindable<string | undefined>()
	}: Props = $props();

	let editingContact = $state(contact ? { ...contact } : {});

	const handleSave = (event: Event) => {
		event.preventDefault();

		if (!isFormValid || disabled) {
			return;
		}
		if (nonNullish(editingContact.name)) {
			editingContact.name = editingContact.name.trim();
		}
		if (isNewContact && nonNullish(editingContact.name)) {
			onAddContact({ name: editingContact.name });
		} else {
			onSaveContact(editingContact as ContactUi);
		}
	};

	const trimedTitle = $derived(
		notEmptyString(editingContact.name?.trim())
			? editingContact.name
			: $i18n.contact.form.add_new_contact
	);

	let isFormValid = $state(false);

	$effect(() => {
		title = trimedTitle;
	});
</script>

<form class="flex w-full flex-col items-center" method="POST" onsubmit={handleSave}>
	<ContentWithToolbar styleClass="flex flex-col gap-6 items-center w-full">
		<Avatar name={editingContact?.name} image={editingContact?.image} variant="xl"></Avatar>
		<InputContactName {disabled} bind:contact={editingContact} bind:isValid={isFormValid} />

		<!-- TODO Add address list here -->

		{#snippet toolbar()}
			<ButtonGroup>
				<ButtonCancel {disabled} onclick={() => onClose()} testId={ADDRESS_BOOK_CANCEL_BUTTON}
				></ButtonCancel>
				<Button
					colorStyle="primary"
					disabled={!isFormValid}
					loading={disabled}
					testId={ADDRESS_BOOK_SAVE_BUTTON}
					type="submit"
				>
					{$i18n.core.text.save}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>
