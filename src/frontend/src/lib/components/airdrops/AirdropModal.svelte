<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	export let airdrop;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{airdrop.airdrop}</svelte:fragment>

	<ContentWithToolbar>
		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>
