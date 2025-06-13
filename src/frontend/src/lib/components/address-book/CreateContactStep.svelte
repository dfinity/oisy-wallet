<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressForm from '$lib/components/address/InputAddressAlias.svelte';
	import ContactForm from '$lib/components/address-book/InputContactName.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		ADDRESS_BOOK_BACK_BUTTON,
		ADDRESS_BOOK_SAVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AddressBookModalParams } from '$lib/types/address-book';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { mapAddressToContactAddressUi } from '$lib/utils/contact.utils';

	interface Props {
		onSave: (contact: ContactUi) => void;
		onBack: () => void;
		disabled?: boolean;
	}

	let { onSave, onBack, disabled = false }: Props = $props();

	let modalData: AddressBookModalParams = $derived($modalStore?.data as AddressBookModalParams);
	let modalDataAddress: string | undefined = $derived(
		modalData?.entrypoint?.type === AddressBookSteps.SAVE_ADDRESS
			? modalData.entrypoint.address
			: undefined
	);

	let editingAddress = $state<Partial<ContactAddressUi>>({});
	let editingContact = $state<Partial<ContactUi>>({});

	let addressModel = $derived(
		nonNullish(modalDataAddress)
			? (mapAddressToContactAddressUi(modalDataAddress) ?? editingAddress)
			: editingAddress
	);

	const handleSubmit = (event: Event) => {
		event.preventDefault();
		if (isFormValid && !disabled) {
			onSave({ ...editingContact, addresses: [addressModel] } as ContactUi);
		}
	};

	let validName = $state(false);
	let validAddress = $state(false);

	let isFormValid = $derived(validName && validAddress);
</script>

<form onsubmit={handleSubmit} method="POST" class="flex w-full flex-col items-center">
	<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
		<div class="w-full text-2xl font-bold text-primary md:text-3xl">
			<ContactForm bind:contact={editingContact} bind:isValid={validName} />
		</div>

		<div class="mt-2 w-full rounded-lg bg-brand-subtle-10 px-3 py-4 text-sm md:px-5 md:text-base">
			<AddressForm
				disableAddressField={nonNullish(modalDataAddress)}
				bind:address={addressModel}
				bind:isValid={validAddress}
				{disabled}
			/>
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<ButtonBack {disabled} onclick={onBack} testId={ADDRESS_BOOK_BACK_BUTTON}></ButtonBack>
				<Button
					type="submit"
					colorStyle="primary"
					disabled={!isFormValid}
					testId={ADDRESS_BOOK_SAVE_BUTTON}
					loading={disabled}
				>
					{$i18n.core.text.save}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>
