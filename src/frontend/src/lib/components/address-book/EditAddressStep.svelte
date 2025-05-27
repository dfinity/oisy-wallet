<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressForm from '$lib/components/address/AddressForm.svelte';
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
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';

	interface Props {
		contact: ContactUi;
		address?: Partial<ContactAddressUi>;
		onSaveAddress: (address: ContactAddressUi) => void;
		onAddAddress: (address: ContactAddressUi) => void;
		onClose: () => void;
		isNewAddress: boolean;
	}

	let {
		contact,
		address = $bindable({}),
		onSaveAddress,
		onAddAddress,
		onClose,
		isNewAddress
	}: Props = $props();

	const handleSave = () => {
		if (isNewAddress) {
			onAddAddress({ ...address } as ContactAddressUi);
		} else {
			onSaveAddress(address as ContactAddressUi);
		}
	};

	let title = $derived(
		isNewAddress
			? $i18n.address.form.new_address
			: nonNullish(address.addressType)
				? $i18n.address.types[address.addressType]
				: ''
	);

	let isInvalid = $state(false);
</script>

<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
	<Avatar variant="xl" name={contact.name} />

	<div class="text-2xl font-bold text-primary md:text-3xl">
		{contact.name}
	</div>
	<div
		class="mt-2 w-full rounded-lg bg-brand-light px-3 py-4 text-sm md:px-5 md:text-base md:font-bold"
	>
		<div class="pb-4 text-xl font-bold">{title}</div>
		<AddressForm {isNewAddress} {address} bind:isInvalid></AddressForm>
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={onClose} testId={ADDRESS_BOOK_CANCEL_BUTTON}></ButtonCancel>
		<Button
			colorStyle="primary"
			disabled={isInvalid}
			on:click={handleSave}
			testId={ADDRESS_BOOK_SAVE_BUTTON}
		>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
