<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
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
		onAddContact: (contact: ContactUi) => void;
		onClose: () => void;
	}

	let { onAddContact, onClose }: Props = $props();

	let contact: Partial<ContactUi> = $state({ addresses: [] });
	let form: ContactForm | undefined = $state();

	const handleAdd = () => {
		if (form?.isValid) {
			onAddContact(contact as ContactUi);
		}
	};

	let title = $derived(
		notEmptyString(contact?.name?.trim?.()) ? contact?.name : $i18n.contact.form.add_new_contact
	);

	export { title };
</script>

<ContentWithToolbar styleClass="flex flex-col gap-6 items-center">
	<Avatar name={contact?.name} variant="xl"></Avatar>
	<ContactForm bind:contact bind:this={form}></ContactForm>

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={() => onClose()} testId={ADDRESS_BOOK_CANCEL_BUTTON}></ButtonCancel>
		<Button
			colorStyle="primary"
			on:click={handleAdd}
			disabled={!form?.isValid}
			testId={ADDRESS_BOOK_SAVE_BUTTON}
		>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
