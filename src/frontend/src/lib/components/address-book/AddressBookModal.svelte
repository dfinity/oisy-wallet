<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import EmptyAddressBook from '$lib/components/address-book/empty-address-book.svelte';

	onMount(async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}
	});
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{$i18n.address_book.text.title}</span>
	</svelte:fragment>

	<ContentWithToolbar styleClass="flex items-center justify-center">
		<EmptyAddressBook></EmptyAddressBook>

		<ButtonCloseModal isPrimary slot="toolbar" />
	</ContentWithToolbar>
</Modal>
