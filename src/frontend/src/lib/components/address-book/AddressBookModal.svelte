<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { loadContacts } from '$icp/services/manage-contacts.services';
	import { contactsStore, contactsStoreState } from '$icp/stores/contacts.store';
	import ContactsList from '$lib/components/address-book/ContactsList.svelte';
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { get } from 'svelte/store';

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (!get(contactsStore)) {
			loadContacts();
		}
	});

	const styles = $derived(
		`mx-2 flex flex-col justify-center ${$contactsStoreState === 'loaded' ? '' : 'items-center'}`
	);

	function deleteContact() {}
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{$i18n.address_book.text.title}</span>
	</svelte:fragment>

	<ContentWithToolbar styleClass={styles}>
		{#if $contactsStoreState === 'loading'}
			Loading...
			<SkeletonCards rows={5} />
			{JSON.stringify($contactsStore)}
		{:else if $contactsStoreState === 'empty'}
			<EmptyAddressBook></EmptyAddressBook>
		{:else}
			<div class="flex items-center">
				<Button
					colorStyle="secondary-light"
					on:click={() => modalStore.openContact({ previousModal: 'address-book' })}
					>{$i18n.address_book.text.add_new_contact}</Button
				>
			</div>
			<div class="grow">
				<PageTitle>Contacts</PageTitle>
				<ContactsList contacts={$contactsStore} {deleteContact}></ContactsList>
			</div>
		{/if}
		<ButtonCloseModal isPrimary slot="toolbar" />
	</ContentWithToolbar>
</Modal>
