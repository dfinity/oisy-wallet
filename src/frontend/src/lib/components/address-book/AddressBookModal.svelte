<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import type { ContactImage } from '$declarations/backend/backend.did';
	import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
	import AddressBookQrCodeStep from '$lib/components/address-book/AddressBookQrCodeStep.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import CreateContactStep from '$lib/components/address-book/CreateContactStep.svelte';
	import DeleteAddressConfirmBottomSheet from '$lib/components/address-book/DeleteAddressConfirmBottomSheet.svelte';
	import DeleteAddressConfirmContent from '$lib/components/address-book/DeleteAddressConfirmContent.svelte';
	import DeleteContactConfirmBottomSheet from '$lib/components/address-book/DeleteContactConfirmBottomSheet.svelte';
	import DeleteContactConfirmContent from '$lib/components/address-book/DeleteContactConfirmContent.svelte';
	import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
	import SaveAddressStep from '$lib/components/address-book/SaveAddressStep.svelte';
	import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { addressBookWizardSteps } from '$lib/config/address-book.config';
	import {
		TRACK_CONTACT_CREATE_ERROR,
		TRACK_CONTACT_CREATE_SUCCESS,
		TRACK_CONTACT_DELETE_ERROR,
		TRACK_CONTACT_DELETE_SUCCESS,
		TRACK_CONTACT_UPDATE_ERROR,
		TRACK_CONTACT_UPDATE_SUCCESS,
		TRACK_AVATAR_UPDATE_SUCCESS,
		TRACK_AVATAR_UPDATE_ERROR,
		TRACK_AVATAR_DELETE_SUCCESS,
		TRACK_AVATAR_DELETE_ERROR
	} from '$lib/constants/analytics.contants';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { sortedContacts } from '$lib/derived/contacts.derived';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { makeController } from '$lib/services/addressBookModal.services';
	import {
		createContact,
		deleteContact,
		updateContact
	} from '$lib/services/manage-contacts.service';
	import { addressBookStore } from '$lib/stores/address-book.store';
	import {
		loading,
		currentStep,
		currentStepName,
		previousStepName,
		currentContact,
		currentContactId,
		currentAddressIndex,
		qrCodeAddress,
		isDeletingContact,
		editContactNameTitle
	} from '$lib/stores/addressBookModal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AddressBookModalParams } from '$lib/types/address-book';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let modal: WizardModal<AddressBookSteps> | undefined;
	let editContactNameStep = $state<EditContactNameStep>();

	const steps = $derived(addressBookWizardSteps({ i18n: $i18n }));

	const modalData = $derived($modalStore?.data as AddressBookModalParams | undefined);

	let controller: ReturnType<typeof makeController> | undefined;
	$effect(() => {
		if (nonNullish(modal)) {
			controller = makeController({
				i18n: $i18n,
				identity: $authIdentity,
				createContact,
				updateContact,
				deleteContact,
				steps,
				modal
			});
		}
	});

  	// Allow to define an entrypoint when opening the modal. Here we listen to the modal data and go to the entrypoint step if were not already on it.
	onMount(() => {
		const data = modalData?.entrypoint?.type;
    
		if (nonNullish(data) && currentStep?.name !== data) {
			gotoStep(data);
	});

	// Reset address book store on modal exit so we can start fresh the next time it's opened
	onDestroy(() => {
		addressBookStore.reset();
	});

	const close = () => {
		if (nonNullish(modalData?.entrypoint?.onComplete)) {
			modalData.entrypoint.onComplete();
			return;
		}
		modalStore.close();
	};

	const gotoStep = (stepName: AddressBookSteps) => {
		if (nonNullish(modal)) {
			previousStepName.set($currentStepName);
			goToWizardStep({ modal, steps, stepName });
		}
	};

	const handleClose = () => {
		const prev = $previousStepName;
		gotoStep(prev ?? AddressBookSteps.ADDRESS_BOOK);
		previousStepName.set(undefined);
	};

	const confirmDeleteContact = () => {
		if (nonNullish($currentContact)) {
			gotoStep(AddressBookSteps.DELETE_CONTACT);
		}
	};

	const confirmDeleteAddress = (index: number) => {
		if (nonNullish($currentContact)) {
			currentAddressIndex.set(index);
			gotoStep(AddressBookSteps.DELETE_ADDRESS);
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={$loading}
	onClose={close}
	{steps}
	testId={ADDRESS_BOOK_MODAL}
	bind:currentStep={$currentStep}
>
	{#snippet title()}
		{#if $currentStepName === AddressBookSteps.SHOW_ADDRESS && nonNullish($currentContact?.name)}
			<div class="flex flex-wrap items-center gap-2">
				<Avatar
					name={$currentContact.name}
					image={$currentContact.image}
					styleClass="rounded-full flex items-center justify-center"
					variant="xs"
				/>
				<div class="text-center text-lg font-semibold text-primary">
					{$currentContact.name}
				</div>
			</div>
		{:else if $currentStepName === AddressBookSteps.DELETE_CONTACT && nonNullish($currentContact)}
			{replacePlaceholders($i18n.contact.delete.title, { $contact: $currentContact.name })}
		{:else if $currentStepName === AddressBookSteps.EDIT_CONTACT_NAME && nonNullish(editContactNameStep)}
			{$editContactNameTitle}
		{:else}
			{$currentStep?.title}
		{/if}
	{/snippet}

	{#if $currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep
			contacts={$sortedContacts}
			onAddContact={() => {
				currentContactId.set(undefined);
				currentAddressIndex.set(undefined);
				previousStepName.set(AddressBookSteps.ADDRESS_BOOK);
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
			onShowAddress={({ contact, addressIndex }) => {
				currentContactId.set(contact.id);
				currentAddressIndex.set(addressIndex);
				previousStepName.set(AddressBookSteps.ADDRESS_BOOK);
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
			}}
			onShowContact={(contact) => {
				currentContactId.set(contact.id);
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
		/>
	{:else if $currentStepName === AddressBookSteps.SHOW_CONTACT && nonNullish($currentContact)}
		<ShowContactStep
			contact={$currentContact}
			onAddAddress={() => {
				currentAddressIndex.set(undefined);
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
			onClose={() => {
				if (nonNullish(modalData?.entrypoint)) {
					gotoStep(modalData.entrypoint.type);
				} else {
					gotoStep(AddressBookSteps.ADDRESS_BOOK);
				}
			}}
			onEdit={(c) => {
				currentContactId.set(c.id);
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onShowAddress={(index) => {
				currentAddressIndex.set(index);
				previousStepName.set(AddressBookSteps.SHOW_CONTACT);
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
			}}
		/>
	{:else if $currentStepName === AddressBookSteps.EDIT_CONTACT && nonNullish($currentContact)}
		<Responsive down="sm">
			<EditContactStep
				contact={$currentContact}
				onAddAddress={() => {
					currentAddressIndex.set(undefined);
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onAvatarEdit={(img: ContactImage | null) => controller?.handleAddAvatar(img)}
				onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
				onDeleteAddress={(index) => {
					currentAddressIndex.set(index);
				}}
				onDeleteContact={() => {
					isDeletingContact.set(true);
				}}
				onEdit={(c) => {
					currentContactId.set(c.id);
					gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
				}}
				onEditAddress={(index) => {
					currentAddressIndex.set(index);
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
			/>
		</Responsive>

		<Responsive up="md">
			<EditContactStep
				contact={$currentContact}
				onAddAddress={() => {
					currentAddressIndex.set(undefined);
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onAvatarEdit={(img: ContactImage | null) => controller?.handleAddAvatar(img)}
				onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
				onDeleteAddress={(index) => confirmDeleteAddress(index)}
				onDeleteContact={() => confirmDeleteContact()}
				onEdit={(c) => {
					currentContactId.set(c.id);
					gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
				}}
				onEditAddress={(index) => {
					currentAddressIndex.set(index);
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
			/>
		</Responsive>
	{:else if $currentStepName === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={editContactNameStep}
			contact={$currentContact}
			disabled={$loading}
			isNewContact={isNullish($currentContact)}
			onAddContact={async ({ name }: Pick<ContactUi, 'name'>) => {
				const created = await controller?.callCreateContact({ name });
				if (modalData?.entrypoint) {
					currentAddressIndex.set(undefined);
					if (created) {
						currentContactId.set(created.id);
					}
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
					previousStepName.set(AddressBookSteps.SAVE_ADDRESS);
				} else {
					if (created) {
						currentContactId.set(created.id);
						gotoStep(AddressBookSteps.SHOW_CONTACT);
					} else {
						gotoStep(AddressBookSteps.ADDRESS_BOOK);
					}
				}
			}}
			onClose={() => {
				handleClose();
			}}
			onSaveContact={async (contact: ContactUi) => {
				await controller?.callUpdateContact({ contact });
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			bind:title={$editContactNameTitle}
		/>
	{:else if $currentStepName === AddressBookSteps.EDIT_ADDRESS && nonNullish($currentContact)}
		<EditAddressStep
			address={nonNullish($currentAddressIndex)
				? $currentContact.addresses[$currentAddressIndex]
				: nonNullish($qrCodeAddress)
					? { address: $qrCodeAddress }
					: undefined}
			contact={$currentContact}
			disabled={$loading}
			isNewAddress={isNullish($currentAddressIndex)}
			onAddAddress={async (addr: ContactAddressUi) => {
				const res = await controller?.handleAddAddress(addr);
				if (modalData?.entrypoint?.type === AddressBookSteps.SAVE_ADDRESS) {
					close();
					return;
				}
				if (res?.next) {
					gotoStep(res.next);
				}
			}}
			onClose={() => {
				currentAddressIndex.set(undefined);
				handleClose();
			}}
			onQRCodeScan={() => gotoStep(AddressBookSteps.QR_CODE_SCAN)}
			onSaveAddress={async (addr: ContactAddressUi) => {
				const res = await controller?.handleSaveAddress(addr);
				if (res?.next) {
					gotoStep(res.next);
				}
			}}
		/>
	{:else if $currentStepName === AddressBookSteps.DELETE_ADDRESS && nonNullish($currentContact) && nonNullish($currentAddressIndex)}
		<DeleteAddressConfirmContent
			address={$currentContact.addresses[$currentAddressIndex]}
			contact={$currentContact}
			disabled={$loading}
			onCancel={() => {
				currentAddressIndex.set(undefined);
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onDelete={async () => {
				if (nonNullish($currentAddressIndex)) {
					await controller?.handleDeleteAddress($currentAddressIndex);
					currentAddressIndex.set(undefined);
					gotoStep(AddressBookSteps.EDIT_CONTACT);
				}
			}}
		/>
	{:else if $currentStepName === AddressBookSteps.SHOW_ADDRESS}
		{#if nonNullish($currentAddressIndex) && nonNullish($currentContact?.addresses?.[$currentAddressIndex])}
			<AddressBookInfoPage
				address={$currentContact.addresses[$currentAddressIndex]}
				onClose={() => {
					currentAddressIndex.set(undefined);
					handleClose();
				}}
			/>
		{/if}
	{:else if $currentStepName === AddressBookSteps.DELETE_CONTACT && nonNullish($currentContact)}
		<DeleteContactConfirmContent
			contact={$currentContact}
			disabled={$loading}
			onCancel={() => {
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onDelete={async (id: bigint) => {
				const res = await controller?.handleDeleteContact(id);
				if (res?.next) {
					gotoStep(res.next);
				}
			}}
		/>
	{:else if $currentStepName === AddressBookSteps.SAVE_ADDRESS}
		<SaveAddressStep
			onClose={close}
			onCreateContact={() => {
				currentContactId.set(undefined);
				gotoStep(AddressBookSteps.CREATE_CONTACT);
			}}
			onSelectContact={(c: ContactUi) => {
				currentContactId.set(c.id);
				currentAddressIndex.set(undefined);
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
		/>
	{:else if $currentStepName === AddressBookSteps.CREATE_CONTACT}
		<CreateContactStep
			disabled={$loading}
			onBack={() => gotoStep(AddressBookSteps.SAVE_ADDRESS)}
			onSave={async (contact: ContactUi) => {
				loading.set(true);
				const created = await controller?.callCreateContact({ name: contact.name });
				if (created) {
					currentContactId.set(created.id);
					await controller?.callUpdateContact({ contact: { ...created, ...contact } });
				}
				close();
			}}
		/>
	{:else if $currentStepName === AddressBookSteps.QR_CODE_SCAN}
		<AddressBookQrCodeStep
			onCancel={() => gotoStep(AddressBookSteps.EDIT_ADDRESS)}
			onScan={({ code }) => {
				qrCodeAddress.set(code);
			}}
		/>
	{/if}
</WizardModal>

{#if $currentStepName === AddressBookSteps.EDIT_CONTACT && nonNullish($currentContact) && nonNullish($currentAddressIndex)}
	<DeleteAddressConfirmBottomSheet
		address={$currentContact.addresses[$currentAddressIndex]}
		contact={$currentContact}
		disabled={$loading}
		onCancel={() => currentAddressIndex.set(undefined)}
		onDelete={async () => {
			if (nonNullish($currentAddressIndex)) {
				const res = await controller?.handleDeleteAddress($currentAddressIndex);
				currentAddressIndex.set(undefined);
				gotoStep(res?.next ?? AddressBookSteps.EDIT_CONTACT);
			}
		}}
	/>
{:else if $currentStepName === AddressBookSteps.EDIT_CONTACT && nonNullish($currentContact) && $isDeletingContact}
	<DeleteContactConfirmBottomSheet
		contact={$currentContact}
		disabled={$loading}
		onCancel={() => {
			isDeletingContact.set(false);
		}}
		onDelete={async () => {
			isDeletingContact.set(false);
			const id = $currentContact?.id;
			if (nonNullish(id)) {
				const res = await controller?.handleDeleteContact(id);
				gotoStep(res?.next ?? AddressBookSteps.ADDRESS_BOOK);
			}
		}}
	/>
{/if}
