<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { CONTACT_SHOW_CLOSE_BUTTON } from '$lib/constants/test-ids.constants';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		contact: ContactUi;
		onClose: () => void;
		onEdit: (contact: ContactUi) => void;
		onEditAddress: (index: number) => void;
		onAddAddress: () => void;
		onDeleteContact: (id: bigint) => void;
		onDeleteAddress: (index: number) => void;
	}

	let {
		contact,
		onClose,
		onEdit,
		onEditAddress,
		onAddAddress,
		onDeleteContact,
		onDeleteAddress
	}: Props = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col items-stretch gap-3">
	<!-- TODO add contact edit header here: https://github.com/dfinity/oisy-wallet/pull/6557 -->
	<Button on:click={() => onEdit(contact)}>EDIT CONTACT</Button>

	<!--
		TODO: Render AddressListItems here
		https://github.com/dfinity/oisy-wallet/pull/6243 
		-->
	{#each contact.addresses as address, index (index)}
		<div class="flex items-center">
			<div class="grow">ADDRESS: {address.addressType} {address.address} {address.label}</div>
			<div class="flex gap-2">
				<Button styleClass="flex-none" on:click={() => onEditAddress(index)}>EDIT</Button>
				<Button styleClass="flex-none" on:click={() => onDeleteAddress(index)}>DELETE</Button>
			</div>
		</div>
		<Hr />
	{/each}

	<!-- TODO Implement proper button here -->
	<Button ariaLabel="" on:click={onAddAddress}>ADD ADDRESS</Button>

	<Hr />

	<!-- TODO Implement proper button here -->
	<Button on:click={() => onDeleteContact(contact.id)}>DELETE CONTACT</Button>

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={() => onClose()} testId={CONTACT_SHOW_CLOSE_BUTTON}></ButtonCancel>
	</ButtonGroup>
</ContentWithToolbar>
