<script lang="ts">
import { modalStore } from '$lib/stores/modal.store';
import { Modal } from '@dfinity/gix-components';
import { i18n } from '$lib/stores/i18n.store';
import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';

	export let airdrop;
</script>


<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{airdrop.airdrop}</svelte:fragment>

	<ContentWithToolbar>

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>