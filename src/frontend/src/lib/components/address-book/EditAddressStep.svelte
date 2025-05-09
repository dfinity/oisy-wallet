<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import AddressForm from '$lib/components/address/AddressForm.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		ADDRESS_EDIT_CANCEL_BUTTON,
		ADDRESS_EDIT_SAVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address, Contact } from '$lib/types/contact';

	let form: AddressForm | undefined = $state();

	interface Props {
		address?: Partial<Address>;
		contact: Contact;
		saveAddress: (address: Address) => void;
		addAddress: (address: Partial<Address>) => void;
		close: () => void;
	}

	let { address = $bindable({}), contact, saveAddress, addAddress, close }: Props = $props();

	const handleSave = () => {
		if (isNullish(address.id)) {
			addAddress(address);
		} else {
			saveAddress(address as Address);
		}
	};
</script>

<ContentWithToolbar styleClass="flex flex-col items-center pb-5">
	<div class="flex flex-col items-center pb-5">
		<div>
			<Avatar variant="xl" name={contact.name}></Avatar>
		</div>
		<div class="pt-5 text-2xl font-bold text-primary md:text-3xl">
			{contact.name}
		</div>
	</div>

	<AddressForm bind:this={form} {address}></AddressForm>
	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={() => close()} testId={ADDRESS_EDIT_CANCEL_BUTTON}></ButtonCancel>
		<Button
			colorStyle="primary"
			on:click={() => handleSave()}
			disabled={!form?.isValid}
			testId={ADDRESS_EDIT_SAVE_BUTTON}
		>
			{$i18n.core.text.save}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
