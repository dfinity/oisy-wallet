<script>
	import { modalAirdrop } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
</script>

<Modal visible={$modalAirdrop} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Airdrop status</svelte:fragment>
</Modal>
