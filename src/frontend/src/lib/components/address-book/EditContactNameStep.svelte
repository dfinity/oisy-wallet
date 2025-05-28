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
		onAddContact: (contact: Pick<ContactUi, 'name'>) => Promise<void>;
		onSaveContact: (contact: ContactUi) => Promise<void>;
		onClose: () => void;
		isNewContact: boolean;
	}

	let {
		onAddContact,
		onSaveContact,
		onClose,
		isNewContact,
		contact = $bindable({})
	}: Props = $props();

	let loading = $state(false);
	let form: ContactForm | undefined = $state();

	const handleSave = async () => {
		if (!form?.isValid) {
			return;
		}

		try {
			loading = true;
			if (isNewContact && nonNullish(contact.name)) {
				await onAddContact({ name: contact.name });
			} else {
				await onSaveContact(contact as ContactUi);
			}
		} finally {
			loading = false;
		}
	};
</script>

<ContentWithToolbar styleClass="flex flex-col gap-6 items-center">
	<Avatar name={contact?.name} variant="xl"></Avatar>
	<ContactForm bind:contact bind:this={form} disabled={loading} />

	<!-- TODO Add address list here -->

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={() => onClose()} testId={ADDRESS_BOOK_CANCEL_BUTTON} disabled={loading} />
		<Button
			colorStyle="primary"
			on:click={handleSave}
			disabled={!form?.isValid}
			testId={ADDRESS_BOOK_SAVE_BUTTON}
			{loading}
		>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
