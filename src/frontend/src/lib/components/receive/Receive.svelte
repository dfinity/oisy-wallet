<script lang="ts">
	import ReceiveAddressModal from '$lib/components/receive/ReceiveAddressModal.svelte';
	import ReceiveAddresses from '$lib/components/receive/ReceiveAddresses.svelte';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import { modalReceive } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	export let loading = true;

	const modalId = Symbol();
</script>

<svelte:window on:oisyReceive={() => modalStore.openReceive(modalId)} />

<ReceiveButtonWithModal open={modalStore.openReceive} isOpen={$modalReceive} {modalId} {loading}>
	<ReceiveAddressModal infoCmp={ReceiveAddresses} on:nnsClose={modalStore.close} slot="modal" />
</ReceiveButtonWithModal>
