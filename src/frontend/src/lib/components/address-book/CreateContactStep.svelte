<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressForm from '$lib/components/address/AddressForm.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		ADDRESS_BOOK_CANCEL_BUTTON,
		ADDRESS_BOOK_SAVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AddressBookModalParams } from '$lib/types/address-book';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { mapAddressToContactAddressUi } from '$lib/utils/contact.utils';
	import ContactForm from '$lib/components/address-book/ContactForm.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';

	interface Props {
		onSave: (contact: ContactUi) => void;
		onBack: () => void;
		onClose: () => void;
	}

	let { onSave, onBack, onClose }: Props = $props();

	let modalData: AddressBookModalParams = $derived($modalStore?.data as AddressBookModalParams);
	let modalDataAddress: string | undefined = $derived(
		modalData?.entrypoint?.type === AddressBookSteps.SAVE_ADDRESS
			? modalData.entrypoint.address
			: undefined
	);
	let modalDataAddressUi = $derived(
		nonNullish(modalDataAddress) ? mapAddressToContactAddressUi(modalDataAddress) : undefined
	);

	let editingContact = $state<Partial<ContactUi>>({
		addresses: nonNullish(modalDataAddressUi) ? [modalDataAddressUi] : []
	});

	const handleSave = () => {
		onSave(editingContact as ContactUi);
	};

	const handleSubmit = (event: Event) => {
		event.preventDefault();
		if (!isInvalid) {
			handleSave();
		}
	};

	let isInvalid = $state(false);
</script>

<form onsubmit={handleSubmit} method="POST" class="flex w-full flex-col items-center">
	<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
		<div class="w-full text-2xl font-bold text-primary md:text-3xl">
			<ContactForm bind:contact={editingContact} />
		</div>

		<div class="mt-2 w-full rounded-lg bg-brand-subtle-10 px-3 py-4 text-sm md:px-5 md:text-base">
			<AddressForm disableAddressField address={modalDataAddressUi ?? {}} bind:isInvalid />
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<ButtonBack disabled={false} onclick={onBack} testId={ADDRESS_BOOK_CANCEL_BUTTON}
				></ButtonBack>
				<Button
					colorStyle="primary"
					disabled={isInvalid}
					onclick={handleSave}
					testId={ADDRESS_BOOK_SAVE_BUTTON}
					loading={false}
				>
					{$i18n.core.text.save}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>
