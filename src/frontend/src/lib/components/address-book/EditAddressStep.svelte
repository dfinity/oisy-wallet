<script lang="ts">
	import AddressForm from '$lib/components/address/AddressForm.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';

	interface Props {
		address?: Partial<ContactAddressUi>;
		contact: ContactUi;
		onSaveAddress: (address: ContactAddressUi) => void;
		onAddAddress: (address: ContactAddressUi) => void;
		onClose: () => void;
		isNewAddress: boolean;
	}

	let {
		address = $bindable({}),
		contact,
		onSaveAddress,
		onAddAddress,
		onClose,
		isNewAddress
	}: Props = $props();

	const handleSave = () => {
		if (isNewAddress) {
			onAddAddress({
				...address,
				// TODO: Remove when address input field with type detection has been merged
				//  https://github.com/dfinity/oisy-wallet/pull/6284
				addressType: 'Icrcv2'
			} as ContactAddressUi);
		} else {
			onSaveAddress(address as ContactAddressUi);
		}
	};

	// TODO: Will be used in followup PR: https://github.com/dfinity/oisy-wallet/pull/6890
	let isInvalid = $state(false);
</script>

<ContentWithToolbar styleClass="flex flex-col items-center pb-5">
	<!-- TODO Replace with implementation here: https://github.com/dfinity/oisy-wallet/pull/6557 -->
	EDIT ADDRESS STEP: {contact.name}

	<AddressForm {isNewAddress} {address} bind:isInvalid></AddressForm>

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={onClose}></ButtonCancel>
		<Button colorStyle="primary" on:click={handleSave}>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
