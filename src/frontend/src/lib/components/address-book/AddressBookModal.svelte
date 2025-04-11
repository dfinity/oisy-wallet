<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}
	});

	const contacts = [];
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{$i18n.address_book.text.title}</span>
	</svelte:fragment>

	<ContentWithToolbar styleClass="mx-2 flex flex-col justify-center items-center">
		{#if contacts.length === 0}
			<EmptyAddressBook></EmptyAddressBook>
		{:else}
			TODO Add contact list here
		{/if}

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
