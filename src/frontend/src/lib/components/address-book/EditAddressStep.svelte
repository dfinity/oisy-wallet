<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import InputAddressAlias from '$lib/components/address/InputAddressAlias.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
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

	interface Props {
		contact: ContactUi;
		address?: Partial<ContactAddressUi>;
		onSaveAddress: (address: ContactAddressUi) => void;
		onAddAddress: (address: ContactAddressUi) => void;
		onClose: () => void;
		onQRCodeScan: () => void;
		isNewAddress: boolean;
		disabled?: boolean;
	}

	let {
		contact,
		address = {},
		onSaveAddress,
		onAddAddress,
		onClose,
		onQRCodeScan,
		isNewAddress,
		disabled = false
	}: Props = $props();

	let editingAddress = $state(address ? { ...address } : {});

	let modalData: AddressBookModalParams = $derived($modalStore?.data as AddressBookModalParams);
	let modalDataAddress: string | undefined = $derived(
		modalData?.entrypoint?.type === AddressBookSteps.SAVE_ADDRESS
			? modalData.entrypoint.address
			: undefined
	);

	let addressModel = $derived(
		nonNullish(modalDataAddress)
			? (mapAddressToContactAddressUi(modalDataAddress) ?? editingAddress)
			: editingAddress
	);

	const handleSave = () => {
		if (isNewAddress) {
			onAddAddress({ ...addressModel } as ContactAddressUi);
		} else {
			onSaveAddress(editingAddress as ContactAddressUi);
		}
	};

	const handleSubmit = (event: Event) => {
		event.preventDefault();
		if (isFormValid && !disabled) {
			handleSave();
		}
	};

	let title = $derived(
		isNewAddress
			? $i18n.address.form.new_address
			: nonNullish(editingAddress.addressType)
				? $i18n.address.types[editingAddress.addressType]
				: ''
	);

	let isFormValid = $state(false);

	const focusField = isNewAddress ? 'address' : 'label';

	let originalLabel = $derived(!isNewAddress && nonNullish(address?.label) ? address.label : '');
	let labelChanged = $derived(isNewAddress ? true : editingAddress.label !== originalLabel);
</script>

<form class="flex w-full flex-col items-center" method="POST" onsubmit={handleSubmit}>
	<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
		<Avatar name={contact.name} image={contact.image} variant="xl" />

		<div class="text-2xl font-bold text-primary md:text-3xl">
			{contact.name}
		</div>

		<div class="mt-2 w-full rounded-lg bg-brand-subtle-10 px-3 py-4 text-sm md:px-5 md:text-base">
			<div class="pb-4 text-xl font-bold">{title}</div>

			<InputAddressAlias
				address={addressModel}
				disableAddressField={!isNewAddress || nonNullish(modalDataAddress)}
				{disabled}
				{focusField}
				{onQRCodeScan}
				bind:isValid={isFormValid}
			/>
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<ButtonCancel {disabled} onclick={onClose} testId={ADDRESS_BOOK_CANCEL_BUTTON}
				></ButtonCancel>
				<Button
					colorStyle="primary"
					disabled={!isFormValid || (!isNewAddress && !labelChanged)}
					loading={disabled}
					onclick={handleSave}
					testId={ADDRESS_BOOK_SAVE_BUTTON}
				>
					{$i18n.core.text.save}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>
