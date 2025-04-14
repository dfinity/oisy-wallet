<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const contacts = [];
</script>

<Modal on:nnsClose={modalStore.close}>
	<span class="text-xl" slot="title">{$i18n.address_book.text.title}</span>

	<ContentWithToolbar styleClass="mx-2 flex flex-col justify-center items-center">
		{#if contacts.length === 0}
			<EmptyAddressBook></EmptyAddressBook>
		{:else}
			TODO Add contact list here
		{/if}

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
