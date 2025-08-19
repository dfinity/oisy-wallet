<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import InputAddressAlias from '$lib/components/address/InputAddressAlias.svelte';
	import InputContactName from '$lib/components/address-book/InputContactName.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ADDRESS_BOOK_SAVE_BUTTON } from '$lib/constants/test-ids.constants';
	import { ADDRESS_BOOK_CANCEL_BUTTON } from '$lib/constants/test-ids.constants.js';
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

<form class="flex w-full flex-col items-center" method="POST" onsubmit={handleSubmit}>
	<ContentWithToolbar styleClass="flex flex-col items-center gap-3 md:gap-4 w-full">
		<Avatar name={editingContact?.name} variant="xl"></Avatar>
		<div class="w-full text-2xl font-bold text-primary md:text-3xl">
			<InputContactName bind:contact={editingContact} bind:isValid={validName} />
		</div>

		<div class="mt-2 w-full rounded-lg bg-brand-subtle-10 px-3 py-4 text-sm md:px-5 md:text-base">
			<InputAddressAlias
				disableAddressField={nonNullish(modalDataAddress)}
				{disabled}
				bind:address={addressModel}
				bind:isValid={validAddress}
			/>
		</div>

		{#snippet toolbar()}
			<ButtonGroup>
				<ButtonCancel {disabled} onclick={onBack} testId={ADDRESS_BOOK_CANCEL_BUTTON} />
				<Button
					colorStyle="primary"
					disabled={!isFormValid}
					loading={disabled}
					testId={ADDRESS_BOOK_SAVE_BUTTON}
					type="submit"
				>
					{$i18n.core.text.create}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>
